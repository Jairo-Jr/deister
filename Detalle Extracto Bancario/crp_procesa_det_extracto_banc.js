function crp_procesa_det_extracto_banc(pIntFileId, pObjField) {

    /**
     * LOCAL FUNCTION: __setDetalleExtractoLine
     *
     * Función local que registra la linea del fichero
     */
    function __setDetalleExtractoLine(pIntFileId, mRowFile, pBoolEfectoValid) {

        Ax.db.insert('crp_det_extrac_banc_line', {
            file_seqno:     pIntFileId,
            tipo_doc:       mRowFile['Document Type'],
            docser:         mRowFile['Document'],
            fecha:          mRowFile['Date'],
            import:         mRowFile['Amount'],
            tercero:        mRowFile['Provider'],
            auxnum1:        pBoolEfectoValid ? 1 : 0
        });
    }

    /**
     * LOCAL FUNCTION: __setGestionEfectos
     *
     * Función local que crea gestion de cartera de efectos.
     */
    function __setGestionEfectos(pObjGestion) {

        var mIntSerial = Ax.db.insert("cefecges_pcs", pObjGestion).getSerial();

        return mIntSerial;
    }

    /**
     * LOCAL FUNCTION: __setEfectosToGestion
     *
     * Función local que registra los efectos a la gestion.
     */
    function __setEfectosToGestion(pIntIdGestion, pArrEfectos) {

        var mObjCefecto     = {};
        var mIntNumOrden    = 1;
        var mBcPcsImpdiv    = 0;        // Importe de divisas
        var mBcPcsTotimp    = 0;        // Importe total

        /**
         * Recorrido de los efectos
         */
        pArrEfectos.forEach(mIdEfecto => {

            console.log('ID EFECTO', mIdEfecto);
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

            Ax.db.insert("cefecges_det", mObjCefecto);

            mBcPcsImpdiv = Ax.math.bc.add(mBcPcsImpdiv, mObjCefecto.det_impdiv);
            mBcPcsTotimp = Ax.math.bc.add(mBcPcsTotimp, mObjCefecto.pcs_totimp);

            Ax.db.execute(`
                UPDATE cefecges_pcs
                SET pcs_impdiv = ${mBcPcsImpdiv},
                    pcs_totimp = ${mBcPcsTotimp}
                WHERE pcs_seqno = ?
            `, pIntIdGestion);
        });

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
            console.log('Antes de cerrar la gestion', pIntIdGestion);
            Ax.db.call("cefecges_estado_ava", pIntIdGestion, 0);
            // Ax.db.call("cefecges_estado_ava", Ax.context.adapter.pcs_seqno, 0);
        }

        return pIntIdGestion;

    }

    /**
     * mObjField {
     *      ext_banc_clase     Tipo de accion [P: Pago]/[C: Cobro]
     *      ext_banc_cuenta    Codigo de cuenta financiera
     *  }
     */
    var mObjField     = Ax.util.js.object.assign({}, pObjField);
    var mStrClase     = mObjField.ext_banc_clase;
    var mStrCodCuenta = mObjField.ext_banc_cuenta;

    var mArrayAccion = {'C': 'CTES', 'P': 'PTES'};
    var mArrIdEfectos = [];
    var mIntIdGestion = 0;
    var mStrAccion = mArrayAccion[mStrClase];

    /**
     * Variables de control
     */
    var mBoolEfectoValid = false;
    var mIntTotalReg = 0;
    var mIntProcesados = 0;

    console.log('ARRAY:', mArrayAccion);
    console.log('OBJFIELD:', mObjField);
    console.log('CLASE:', mStrClase);
    console.log('ACCION:', mStrAccion);

    try {
        Ax.db.beginWork();
        // Busqueda de archivo segun el fileId
        let mObjBlobData = Ax.db.executeQuery(`
            <select>
                <columns>
                    file_status, file_data
                </columns>
                <from table='crp_detalle_extracto_banc'/>
                <where>
                    file_seqno = ?
                </where>
            </select>
        `, pIntFileId).toOne();

        /**
         * Valida el estado del fichero
         */
        // if(mObjBlobData.file_status != 'P') {
        //     throw 'Solo es permitido procesar ficheros en estado Pendiente.'
        // }

        /**
         * SCRIPT PARA LEER ARCHIVOS CSV - TXT
         */
        var blob = new Ax.sql.Blob();
        blob.setContent(mObjBlobData.file_data);

        var mRsFichero = new Ax.rs.Reader().csv(options => {
            options.setBlob(blob);
            options.setDelimiter(",");
            options.setHeader(true);
            options.setQuoteChar(7);
            options.setCharset("ISO-8859-15");

            // Definición de tipo de datos a columnas
            options.setColumnType("Provider",  Ax.sql.Types.CHAR);
            // options.setColumnType("Serie de Comprobante",  Ax.sql.Types.CHAR);

        })
        console.log(mRsFichero);

        mRsFichero.forEach(mRowFile => {
            var mStrDocser      = mRowFile['Document'];
            var mFloatImporte   = mRowFile['Amount'];
            var mStrProveedor   = mRowFile['Provider'];

            mIntTotalReg++;

            /**
             * Busqueda de efectos por:
             *  - docser
             *  - import
             *  - tercer
             */
            var mIntIdEfecto = Ax.db.executeGet(`
                <select>
                    <columns>
                        cefectos.numero
                    </columns>
                    <from table='cefectos'>
                        <join table='ctercero'>
                            <on>cefectos.tercer = ctercero.codigo</on>
                        </join>
                    </from>
                    <where>
                        cefectos.estado = 'PE'
                        AND cefectos.docser = ?
                        AND cefectos.import = ?
                        AND ctercero.cif = ?
                    </where>
                </select>
            `, mStrDocser, mFloatImporte, mStrProveedor);

            if (mIntIdEfecto != null) {
                mArrIdEfectos.push(mIntIdEfecto);
                mBoolEfectoValid = true;
                mIntProcesados++;
            }

            console.log(mRowFile);
            __setDetalleExtractoLine(pIntFileId, mRowFile, mBoolEfectoValid);

            mBoolEfectoValid = false;

        });

        console.log('Array Efectos', mArrIdEfectos);
        /**
         * Desarrollo de la gestion de cartera de efectos
         */

        if(mArrIdEfectos.length > 0) {
            var pObjPOBS = {
                pcs_empcode : '125',              // Código de empresa.
                pcs_proyec  : 'CRP0',             // Código de proyecto.
                pcs_seccio  : '0',                // Sección contable
                pcs_clase   : mStrClase,          // Clase de cartera
                pcs_accion  : mStrAccion,         // Código de acción asociada al proceso
                pcs_moneda  : 'PEN',              // Moneda
                pcs_cambio  : '1',                // Cambio de divisa
                pcs_fecpro  : new Ax.util.Date(), // Fecha del proceso
                pcs_estado  : 'A',                // Estado del proceso
                pcs_tipgen  : 0,                  // Tipo de gestion
                pcs_ctafin  : mStrCodCuenta       // Cuenta financiera
            };

            /**
             * Crea la gestion POBS
             */
            mIntIdGestion = __setGestionEfectos(pObjPOBS);

            console.log('ID GESTION: ', mIntIdGestion);

            /**
             * Añade efectos a la gestion
             */
            mIntIdGestion = __setEfectosToGestion(mIntIdGestion, mArrIdEfectos);
        }





        // }
        /**
         * Actualiza las notas
         */
        // Ax.db.execute(`
        //         UPDATE crp_embargo_telematico_respuesta
        //         SET file_memo = 'Gestion de POBS [${mIntIdGestion}] - Gestion de PAUS [${mIntIdGestionPAUS}]',
        //             file_status = 'C'
        //         WHERE file_seqno = ?
        //     `, pIntFileId);

        Ax.db.update(`crp_detalle_extracto_banc`,
            {
                file_status: 'C',
                file_memo: `Gestion [${mIntIdGestion}] - Procesados ${mIntProcesados}/${mIntTotalReg}`,
                auxnum1: mIntIdGestion
            }, {
                file_seqno: pIntFileId
            }
        );

        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();


        Ax.db.update(`crp_detalle_extracto_banc`,
            {
                file_status: 'E',
                file_memo: `${error.message || error}`
            }, {
                file_seqno: pIntFileId
            }
        );

        throw new Ax.ext.Exception(error);
    }


    // return pIntFileId;
}