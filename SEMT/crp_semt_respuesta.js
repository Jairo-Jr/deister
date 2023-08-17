/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
 *  for disclosure of this source code, which includes information that is confidential
 *  and/or proprietary, and is a trade secret, of deister software
 *
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE,
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 *
 * -----------------------------------------------------------------------------
 *
 *  JS:  Name Function
 *  Version     : v1.2
 *  Date        : 16-08-2023
 *  Description : Procesa el archivo de texto de respuesta SUNAT,
 *                generando gestiones para observados y aprobados.
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: crp_semt_respuesta              A través de la acción 'ACTION_BTN_SEMT'
 *
 *  PARAMETERS:
 *  ==================
 *      @param  {integer}   p_fileid        Número serial del registro de la tabla crp_embargo_telematico_respuesta
 *      @param  {string}    pStrFileName    Documento de la remesa
 *
 **/
function crp_semt_respuesta(p_fileid, pStrFileName) {

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
                    pcs_totimp = 0
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
            Ax.db.call("cefecges_estado_ava", pIntIdGestion, 0);
        }

        return pIntIdGestion;

    }

    var mArrPOBS = [];
    var mArrPAUS = [];
    var mIntIdGestionPOBS = 0;
    var mIntIdGestionPAUS = 0;
    var mIntNumEnvio;

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
                    <join table='cefecges_pcs'>
                        <on>cremesas.numrem = cefecges_pcs.pcs_numrem</on>
                        <on>cremesas.accion = cefecges_pcs.pcs_accion</on>
                        <join table='cefecges_det'>
                            <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                            <join table='cefectos'>
                                <on>cefecges_det.det_numero = cefectos.numero</on>
                                <join type='left' table='ctercero'>
                                    <on>cefectos.tercer = ctercero.codigo</on>
                                </join>
                            </join>
                        </join>
                    </join>
                    
                </from>
                <where>
                    cremesas.jusser = ?
                </where>
            </select>
        `, pStrFileName).toJSONArray();

        mRsFichero.forEach(mRowFile => {

            mIntNumEnvio = mRowFile['Column_0'];

            var mStrFecReg = mRowFile['Column_5'];
            mStrFecReg = mStrFecReg.replaceAll('/', '-');

            var mStrCodCal = Ax.db.executeGet(`SELECT codcal 
                FROM cremesas, cempresa 
                WHERE cremesas.empcode = cempresa.empcode AND  
                jusser = (SELECT file_name FROM crp_embargo_telematico_respuesta WHERE file_seqno = ?)`, p_fileid);


            var date_1 = new Ax.util.Date(mStrFecReg);
            var date_2 = new Ax.util.Date(Ax.db.executeGet(`SELECT ccalendah_add_business_days('${mStrCodCal}','${date_1.format('dd-MM-YYYY')}', 5)   FROM wic_dual`));

            date_2 = date_2.addHour(date_1.format('HH')).addMinute(date_1.format('mm')).addSecond(date_1.format('ss'))

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
                // fec_registro:   mRowFile['Column_5'],
                fec_registro:   date_1,
                monto_pagar:    parseFloat(mRowFile['Column_6']),
                estado_reg:     mRowFile['Column_7'],
                desc_estado:    mRowFile['Column_8'],
                fec_limite:     date_2,
                res_coactiva:   mRowFile['Column_9'],
                observado:      mRowFile['Column_7'] == 1 ? 0 : 1
            });

            /**
             * Actualiza el numero de operacion
             */
            mObjRemesas.forEach(mObjRemesa => {

                if(mObjRemesa.cif == mRowFile['Column_3']){

                    /**
                     * Registro del numero de operacion en el efecto
                     */
                    var resUpd = Ax.db.execute(`UPDATE cefectos SET auxnum1 = ${mRowFile['Column_1']}
                                    WHERE numero = ${mObjRemesa.numero} 
                                    AND auxnum1 IS NULL`);

                    /**
                     * Tiene deuda - Agrupa Gestion con esatdo POBS
                     */
                    // if(resUpd.count == 1 && mRowFile['Column_7'] == 1) {
                    if(mRowFile['Column_7'] == 1) {
                        mArrPOBS.push(mObjRemesa.numero)
                    }

                    /**
                     * No tiene deuda - Agrupa Gestion con esatdo PAUS
                     */
                    // if(resUpd.count == 1 && mRowFile['Column_7'] == 0) {
                    if(mRowFile['Column_7'] == 0) {
                        mArrPAUS.push(mObjRemesa.numero)
                    }
                }
            });

        });

        /**
         * Gestion para POBS
         */

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

            /**
             * Añade efectos a la gestion
             */
            mIntIdGestionPOBS = __setEfectosToGestion(mIntIdGestionPOBS, mArrPOBS);
        }



        /**
         * Crea Gestion para PAUS
         */

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
                seqno_paus: mIntIdGestionPAUS,
                nmr_envio: mIntNumEnvio
            }, {
                file_seqno: p_fileid
            }
        );

        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();

        throw new Ax.ext.Exception(error);

        /*Ax.db.update(`crp_embargo_telematico_respuesta`,
            {
                file_status: 'E',
                file_memo: `${error.message || error}`
            }, {
                file_seqno: p_fileid
            }
        );*/
    }


    // return p_fileid;
}