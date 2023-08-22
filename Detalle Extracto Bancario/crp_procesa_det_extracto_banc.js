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
 *  JS:  crp_procesa_det_extracto_banc
 *  Version     : v1.4
 *  Date        : 22-08-2023
 *  Description : Funcion que procesa detalle de extractos bancarios y genera
 *                gestion sobre cartera de efectos.
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: crp_detalle_extracto_banc          A través de la acción 'BTN_PROCESS_FILE'
 *
 *  PARAMETERS:
 *  ==================
 *      @param  {integer}   pIntFileId              Identificador de fichero
 *      @param  {Object}    pObjField               Datos de entrada field:
 *                              - ext_banc_clase    Clase de proceso [C/P]
 *                              - ext_banc_cuenta   Cuenta financiera
 *
 **/
function crp_procesa_det_extracto_banc(pIntFileId, pObjField) {

    /**
     * LOCAL FUNCTION: __setDetalleExtractoLine
     *
     * Description: Función local que registra la linea del fichero
     *              en una tabla de respaldo
     *
     * PARAMETERS:
     *      @param  {integer}       pIntFileId              Identificador de fichero
     *      @param  {Object}        mRowFile                Data con informacion de linea
     *      @param  {integer}       pBoolEfectoValid        Existencia de efecto
     */
    function __setDetalleExtractoLine(pIntFileId, mRowFile, pBoolEfectoValid) {

        Ax.db.insert('crp_det_extrac_banc_line', {
            file_seqno:     pIntFileId,
            tipo_doc:       mRowFile['Tipo documento'],
            docser:         mRowFile['Documento'],
            fecha:          mRowFile['Fecha'],
            import:         mRowFile['Importe'],
            tercero:        mRowFile['Ruc'],
            auxnum1:        pBoolEfectoValid ? 1 : 0
        });
    }

    /**
     * LOCAL FUNCTION: __setGestionEfectos
     *
     * Description: Función local que crea gestion de cartera de efectos.
     *
     * PARAMETERS:
     *      @param  {Object}        pObjGestion             Datos de gestion de cartera de efectos
     */
    function __setGestionEfectos(pObjGestion) {

        var mIntSerial = Ax.db.insert("cefecges_pcs", pObjGestion).getSerial();

        return mIntSerial;
    }

    /**
     * LOCAL FUNCTION: __setEfectosToGestion
     *
     * Description: Función local que registra los efectos a la gestion.
     *
     * PARAMETERS:
     *      @param  {integer}       pIntIdGestion           Identificador de la gestion
     *      @param  {Array}         pArrEfectos             Array con id's de efectos
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
            Ax.db.call("cefecges_estado_ava", pIntIdGestion, 0);
        }

        return pIntIdGestion;

    }

    /**
     *
     * DEFINICIÓN DE VARIABLES
     *
     */

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
        if(mObjBlobData.file_status != 'P') {
            throw 'Solo es permitido procesar ficheros en estado Pendiente.'
        }

        /**
         * Sentencia para leer archviso CSV - TXT
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
            options.setColumnType("Ruc",  Ax.sql.Types.CHAR);
            // options.setColumnType("Serie de Comprobante",  Ax.sql.Types.CHAR);

        })


        mRsFichero.forEach(mRowFile => {

            var mStrDocser      = mRowFile['Documento'];
            var mFloatImporte   = mRowFile['Importe'];
            var mStrProveedor   = mRowFile['Ruc'];
            var mStrFechaFact   = mRowFile['Fecha'];

            mIntTotalReg++;

            /**
             * Busqueda de efectos por:
             *  - docser
             *  - fecha
             *  - tercer
             */
            var mIntIdEfecto = Ax.db.executeQuery(`
                <select>
                    <columns>
                        cefectos.numero,
                        cefectos.import
                    </columns>
                    <from table='cefectos'>
                        <join table='ctercero'>
                            <on>cefectos.tercer = ctercero.codigo</on>
                        </join>
                    </from>
                    <where>
                        cefectos.estado = 'PE'
                        AND cefectos.docser = ?
                        AND cefectos.fecha = ?
                        AND ctercero.cif = ?
                    </where>
                </select>
            `, mStrDocser, mStrFechaFact, mStrProveedor).toOne();

            if (mIntIdEfecto.numero != null) {

                /**
                 * Se rescata el id del efecto
                 */
                mArrIdEfectos.push(mIntIdEfecto.numero);
                mBoolEfectoValid = true;
                mIntProcesados++;

                /**
                 * Si el importe registrado en el txt es menor que la del efecto encontrado,
                 * se actualiza su importe local e importe divisa
                 */
                if (mFloatImporte < mIntIdEfecto.import) {
                    Ax.db.update(`cefectos`,
                        {
                            import: mFloatImporte,
                            impdiv: mFloatImporte
                        }, {
                            numero: mIntIdEfecto.numero
                        }
                    );
                }
            }

            __setDetalleExtractoLine(pIntFileId, mRowFile, mBoolEfectoValid);

            mBoolEfectoValid = false;

        });

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

            /**
             * Añade efectos a la gestion
             */
            mIntIdGestion = __setEfectosToGestion(mIntIdGestion, mArrIdEfectos);
        }

        /**
         * Actualiza las notas
         */
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


    return pIntFileId;
}
