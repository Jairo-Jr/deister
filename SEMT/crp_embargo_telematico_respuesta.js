function crp_embargo_telematico_respuesta(p_fileid, pStrFileName) {

    /**
     * LOCAL FUNCTION: __setGestionEfectos
     *
     * Función local que crea gestion de cartera de efectos
     */
    function __setGestionEfectos(pObjGestion) {

        var mIntSerial = Ax.db.insert("cefecges_pcs", pObjGestion).getSerial();

        return mIntSerial;
    }

    /**
     * LOCAL FUNCTION: __setEfectosToGestion
     *
     * Función local que crea gestion de cartera de efectos
     */
    function __setEfectosToGestion(pIntIdGestion, pArrEfectos) {

        var mObjCefecto = {};
        var mIntNumOrden = 1;
        var mBcPcsImpdiv        = 0;        // Importe de divisas
        var mBcPcsTotimp        = 0;        // Importe total

        /**
         * Recorrido de los efectos POBS
         */
        pArrEfectos.forEach(mIdEfecto => {
            console.log('Id Efecto:', mIdEfecto);

            /**
             * Captura de datos del efecto
             */
            mObjCefecto = Ax.db.executeQuery(`
                <select first='1'>
                    <columns> 
                        cefectos.numero, cefectos.clase,
                        cefectos.tercer, cefectos.fecven,
                        CASE WHEN cefectos.clase = 'C' THEN +cefectos.impdiv ELSE -cefectos.impdiv END impdiv,
                        cefectos.moneda,
                        CASE WHEN cefectos.clase = 'C' THEN +cefectos.import ELSE -cefectos.import END import,
                        CASE WHEN cefectos.clase = 'C' THEN +cefectos.impppa ELSE -cefectos.impppa END impppa,
                        cefectos.docser, cefectos.numefe, cefectos.fecha,
                        cefectos.tipefe, cefectos.estado, cefectos.caduca, 
                        cefectos.ctafin, cefectos.jusser, 
                        cefectos.tipdoc, cefectos.refban,
                        cefectos.proyec, 
                        cefectos.seccio, 
                        cefectos.empcode,cefectos.cuenta,


                        <cast type='integer'>(SELECT COUNT(*)
                            FROM cefecges_pcs g, cefecges_det d
                            WHERE g.pcs_empcode = '001'
                                AND g.pcs_fecpro >= (SELECT MIN(s.fecini) 
                                                    FROM cperiodo s 
                                                    WHERE s.empcode = '001' 
                                                        AND s.estado  = 'A')
                                AND g.pcs_seqno   = d.pcs_seqno
                                AND g.pcs_estado  = 'A'
                                AND d.det_numero  = cefectos.numero) </cast> <alias name='cefectos_in_gestion' />, 

                        CASE WHEN cefectos.clase = 'C' 
                                THEN +cefectos.impdiv 
                                ELSE -cefectos.impdiv 
                        END pcs_totimp

                    </columns>
                    <from table='cefectos'/>
                    <where>
                        cefectos.numero = ?
                    </where>
                </select>
            `, mIdEfecto).toOne();

            /**
             * Data adicional para los detalles de la gestion
             */

            if (mObjCefecto.clase == 'P') {
                mObjCefecto.impdiv     = - mObjCefecto.impdiv;
                mObjCefecto.import     = - mObjCefecto.import;
                mObjCefecto.pcs_totimp = - mObjCefecto.pcs_totimp;
            }

            mObjCefecto.pcs_seqno  = pIntIdGestion;
            mObjCefecto.det_numero = mObjCefecto.numero;
            mObjCefecto.det_impdiv = mObjCefecto.impdiv;
            mObjCefecto.det_import = mObjCefecto.import;
            mObjCefecto.ori_numero = mObjCefecto.numero;
            mObjCefecto.cabid      = mObjCefecto.cabid;
            mObjCefecto.apteid     = 0;
            mObjCefecto.rowenl     = pIntIdGestion;
            mObjCefecto.estcon     = 'N';
            mObjCefecto.det_agrupa = mIntNumOrden++;

            console.log('Detalles', mObjCefecto);

            Ax.db.insert("cefecges_det", mObjCefecto);

            mBcPcsImpdiv = Ax.math.bc.add(mBcPcsImpdiv, mObjCefecto.det_impdiv);
            mBcPcsTotimp = Ax.math.bc.add(mBcPcsTotimp, mObjCefecto.pcs_totimp);

            Ax.db.execute(`
                UPDATE cefecges_pcs
                SET pcs_impdiv = ${mBcPcsImpdiv},
                    pcs_totimp = 0
                WHERE pcs_seqno = ?
            `, pIntIdGestion);
        });

        console.log('*** ->', mObjCefecto);

        var mIntLineasExist = Ax.db.executeGet(`
            SELECT COUNT(*) 
                FROM cefecges_det 
                WHERE pcs_seqno = ?
        `, pIntIdGestion);

        if (mIntLineasExist == 0) {

            /**
             * Se elimina por no tener efectos relacionados
             */
            Ax.db.execute(`
                DELETE FROM cefecges_pcs WHERE pcs_seqno = ?
            `, pIntIdGestion);

            pIntIdGestion = 0;
        } else if(mIntLineasExist > 0) {

            /**
             * Se cierra la gestion de efectos
             */
            Ax.db.call("cefecges_estado_ava", pIntIdGestion, 0);
        }

        return pIntIdGestion;

    }

    var mArrPOBS = [];
    var mArrPAUS = [];
    var mIntIdGestionPOBS = 0;
    var mIntIdGestionPAUS = 0;

    try {
        Ax.db.beginWork();

        // Busqueda de archivo segun el fileId
        let mObjBlobData = Ax.db.executeQuery(`
            SELECT file_status, file_data, file_type, user_updated
            FROM crp_embargo_telematico_respuesta
            WHERE file_seqno = ?
        `, p_fileid).toOne();

        /**
         * Valida el estado del fichero
         */
        if(mObjBlobData.file_status != 'P') {
            throw 'Solo es permitido procesar ficheros en estado Pendiente.'
        }

        /**
         * SCRIPT PARA LEER ARCHIVOS CSV - TXT
         */
        console.log('Antes del fichero');
        var blob = new Ax.sql.Blob();
        blob.setContent(mObjBlobData.file_data);

        var mRsFichero = new Ax.rs.Reader().csv(options => {
            options.setBlob(blob);
            options.setDelimiter("|");
            options.setHeader(false);
            options.setQuoteChar(7);
            options.setCharset("ISO-8859-15");

            // Definición de tipo de datos a columnas
            // options.setColumnType("Numero de Comprobante",  Ax.sql.Types.CHAR);
            // options.setColumnType("Serie de Comprobante",  Ax.sql.Types.CHAR);

        })

        console.log(mRsFichero);

        /**
         * Efectos - Pagos
         */
        var mObjRemesas = Ax.db.executeQuery(`
            <select>
                <columns>
                    ctercero.cif,
                    cefectos.docser,
                    cefectos.numero
                </columns>
                <from table='cremesas'>
                    <join table='cefectos'>
                        <on>cremesas.numrem = cefectos.remesa</on>
                        <join type='left' table='ctercero'>
                            <on>cefectos.codper = ctercero.codigo</on>
                        </join>
                    </join>
                </from>
                <where>
                    cremesas.jusser = ?
                </where>
            </select>
        `, pStrFileName).toJSONArray();

        console.log(mObjRemesas);

        mRsFichero.forEach(mRowFile => {
            /**
             * Registro de respaldo de la data del fichero
             */
            Ax.db.insert('crp_registro_semt', {
                file_seqno:     p_fileid,
                nmr_envio:      mRowFile['Column_0'],
                nmr_operacion:  mRowFile['Column_1'],
                ruc_crp:        mRowFile['Column_2'],
                ruc_tercer:     mRowFile['Column_3'],
                razon:          mRowFile['Column_4'],
                fec_registro:   mRowFile['Column_5'],
                monto_pagar:    parseFloat(mRowFile['Column_6']),
                estado_reg:     mRowFile['Column_7'],
                desc_estado:    mRowFile['Column_8'],
                res_coactiva:   mRowFile['Column_9']
            });

            /**
             * Actualiza el numero de operacion
             */
            mObjRemesas.forEach(mObjRemesa => {

                if(mObjRemesa.cif == mRowFile['Column_3']){
                    // console.log('Remesa', mObjRemesa);

                    /**
                     * Registro del numero de operacion en el efecto
                     */
                    var resUpd = Ax.db.execute(`UPDATE cefectos SET auxnum1 = ${mRowFile['Column_1']}
                                    WHERE numero = ${mObjRemesa.numero} 
                                    AND auxnum1 IS NULL`);
                    // console.log('RES-UPD', resUpd);
                    /**
                     * Tiene deuda - Agrupa Gestion con esatdo POBS
                     */
                    if(resUpd.count == 1 && mRowFile['Column_7'] == 1) {
                        // if(mRowFile['Column_7'] == 1) {
                        mArrPOBS.push(mObjRemesa.numero)
                    }

                    /**
                     * No tiene deuda - Agrupa Gestion con esatdo PAUS
                     */
                    if(resUpd.count == 1 && mRowFile['Column_7'] == 0) {
                        // if(mRowFile['Column_7'] == 0) {
                        mArrPAUS.push(mObjRemesa.numero)
                    }
                }
            });

        });

        /**
         * Gestion para POBS
         */
        console.log('POBS', mArrPOBS);

        if(mArrPOBS.length > 0) {
            var pObjPOBS = {
                pcs_empcode : '125',              // Código de empresa.
                pcs_proyec  : 'CRP0',             // Código de proyecto.
                pcs_seccio  : '0',                // Sección contable
                pcs_clase   : 'P',                // Clase de cartera
                pcs_accion  : 'POBS',             // Código de acción asociada al proceso
                pcs_moneda  : 'PEN',              // Moneda
                pcs_cambio  : '1',                // Cambio de divisa
                pcs_fecpro  : new Ax.util.Date(), // Fecha del proceso
                pcs_estado  : 'A',                // Estado del proceso
                pcs_tipgen  : 0                   // Tipo de gestion
            };

            /**
             * Crea la gestion POBS
             */
            mIntIdGestionPOBS = __setGestionEfectos(pObjPOBS);
            console.log('Id Gestion POBS:', mIntIdGestionPOBS);

            /**
             * Añade efectos a la gestion
             */
            mIntIdGestionPOBS = __setEfectosToGestion(mIntIdGestionPOBS, mArrPOBS);
        }



        /**
         * Crea Gestion para PAUS
         */
        console.log('PAUS', mArrPAUS);

        if (mArrPAUS.length > 0) {
            var pObjPAUS = {
                pcs_empcode : '125',              // Código de empresa.
                pcs_proyec  : 'CRP0',             // Código de proyecto.
                pcs_seccio  : '0',                // Sección contable
                pcs_clase   : 'P',                // Clase de cartera
                pcs_accion  : 'PAUS',             // Código de acción asociada al proceso
                pcs_moneda  : 'PEN',              // Moneda
                pcs_cambio  : '1',                // Cambio de divisa
                pcs_fecpro  : new Ax.util.Date(), // Fecha del proceso
                pcs_estado  : 'A',                // Estado del proceso
                pcs_tipgen  : 0                   // Tipo de gestion
            };

            /**
             * Crea la gestion PACS
             */
            mIntIdGestionPAUS = __setGestionEfectos(pObjPAUS);
            console.log('Id Gestion PAUS:', mIntIdGestionPAUS);

            /**
             * Añade efectos a la gestion
             */
            mIntIdGestionPAUS = __setEfectosToGestion(mIntIdGestionPAUS, mArrPAUS);

        }
        /**
         * Actualiza las notas
         */
        // Ax.db.execute(`
        //         UPDATE crp_embargo_telematico_respuesta
        //         SET file_memo = 'Gestion de POBS [${mIntIdGestionPOBS}] - Gestion de PAUS [${mIntIdGestionPAUS}]',
        //             file_status = 'C'
        //         WHERE file_seqno = ?
        //     `, p_fileid);

        Ax.db.update(`crp_embargo_telematico_respuesta`,
            {
                file_status: 'C',
                file_memo: `Gestion de POBS [${mIntIdGestionPOBS}] - Gestion de PAUS [${mIntIdGestionPAUS}]`,
                seqno_pobs: mIntIdGestionPOBS,
                seqno_paus: mIntIdGestionPAUS
            }, {
                file_seqno: p_fileid
            }
        );

        console.log('Despues de updatear');
        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();

        console.error(error);

        Ax.db.update(`crp_embargo_telematico_respuesta`,
            {
                file_status: 'E',
                file_memo: `${error.message || error}`
            }, {
                file_seqno: p_fileid
            }
        );
    }


    // return p_fileid;
}

var p_fileid = 5;
var pStrFileName = 'RCP20230721002';
crp_embargo_telematico_respuesta(p_fileid, pStrFileName);