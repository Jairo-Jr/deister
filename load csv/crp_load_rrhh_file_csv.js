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
 * 
 *  JS:  crp_load_rrhh_file 
 *
 *  Version     : v2.1
 *  Date        : 2023-01-12
 *  Description : Procesa ficheros .xls según el tipo de proceso (Costo/Planilla); 
 *                registra los Costos en la tabla de respaldo (crp_rrhh_asign) 
 *                y las planillas en los Mov. Contables (capuntes).
 * 
 *
 *
 *  CALLED FROM:
 * 
 *      Obj: crp_rrhh_file        A través de la acción 'ACTION_BTN_1'
 *
 *
 *  PARAMETERS:
 *  
 *      @param  {integer}   pIntFileId      Identificador de fichero
 *      @param  {string}    pStrCRC         Número CRC de control del fichero
 *      @param  {string}    pStrProc        Proceso de registro (C: centro de costo, P: planilla)
 *      @param  {string}    pStrTipProc     Tipo de proceso (EMP: empleado, PRAC: practicante, PROV: provisión)
 *
 */

 function crp_load_rrhh_file(pIntFileId, pStrCRC, pStrProc, pStrTipProc) { 

    /**
     * LOCAL FUNCTION: __insCosto
     * 
     * Description: Función local que registra los costos en Centro de Costos(t: crp_rrhh_asign).
     * 
     * PARAMETERS:
     *      @param  {integer}       pIntFileId      Identificador de fichero
     *      @param  {ResultSet}     pRsSheet        ResultSet con la data del fichero
     *      @param  {string}        pStrTipProc     Nombre del tipo de proceso (EMP: Empleados, PRAC: Practicantes, PROV: Provisión)
     *      @param  {string}        pStrUserName    Usuario que realiza el registro
     */ 
    function __insCosto(pIntFileId, pRsSheet, pStrTipProc, pStrUserName) {

        pRsSheet.forEach(mRowSheet => { 
            /**
             * Insert en la tabla de respaldo
             */
             Ax.db.insert("crp_rrhh_asign", { 
                file_seqno: pIntFileId,
                dcodcos : mRowSheet.DCODCOS,
                dctagas : mRowSheet.DCTAGAS,
                dctacos : mRowSheet.DCTACOS,
                dvalcom : mRowSheet.DVALCOM,
                tip_proc: pStrTipProc,
                user_created: pStrUserName,
                user_updated: pStrUserName
            });
            // Ax.db.insert("crp_rrhh_asign", { 
            //     file_seqno: pIntFileId,
            //     dcodcos : mRowSheet.A,
            //     dctagas : mRowSheet.B,
            //     dctacos : mRowSheet.C,
            //     dvalcom : mRowSheet.D,
            //     tip_proc: pStrTipProc,
            //     user_created: pStrUserName,
            //     user_updated: pStrUserName
            // });

        });
    }

    /**
     * LOCAL FUNCTION: __insPlanilla
     * 
     * Description: Función local que registra las planillas en Apuntes(t: capuntes)
     * 
     * PARAMETERS:
     *      @param  {ResultSet}     pRsSheet            ResultSet con la data del fichero
     *      @param  {string}        pStrUserName        Usuario que realiza el registro
     *      
     */ 
    function __insPlanilla(pRsSheet, pStrUserName) { 
        /**
         * Se obtiene el identificador de lote 'loteid'.
         */ 
        mIntLoteId = Ax.db.executeGet(`
            <select>
                <columns>
                    MAX(loteid) max_lote_id
                </columns>
                <from table='capuntes'/>
            </select> 
        `) + 1; 

        /**
         * Registro en Movimientos contables 'capuntes'.
         */
        pRsSheet.forEach(mRowSheet => { 
            /**
             * Componer el número de documento según la nulidad de la serie y el comprobante.
             */
            var mStrDocSer = (mRowSheet.SERIE === null || mRowSheet.COMPROBANTE === null) ? '-' : mRowSheet.SERIE + '-' + mRowSheet.COMPROBANTE;

            // Registro de planilla en 'capuntes'
            Ax.db.insert("capuntes", {
                empcode: '001', 
                proyec: 'CRP0',
                sistem: 'A', 
                seccio: '0',
                fecha: mRowSheet.FECHA,
                diario: '40', 
                jusser: 'GL',
                origen: 'M',
                docser: mStrDocSer,
                punteo: 'N',
                placon: 'CH',
                cuenta: mRowSheet.CUENTA,
                codaux: 'RRHH',
                ctaaux: mRowSheet.EMPLEADO,
                contra: null,
                concep: mRowSheet.GLOSA,
                fecval: mRowSheet.FECHADOCU,
                moneda: 'PEN',
                divdeb: mRowSheet.DEBE,
                divhab: mRowSheet.HABER,
                cambio: '1.000000',
                divemp: 'PEN',
                debe: mRowSheet.DEBE,
                haber: mRowSheet.HABER,
                loteid: mIntLoteId,
                user_created: pStrUserName,
                user_updated: pStrUserName
            });
            // Ax.db.insert("capuntes", {
            //     empcode: '001', 
            //     proyec: 'CRP0',
            //     sistem: 'A', 
            //     seccio: '0',
            //     fecha: mRowSheet.C,
            //     diario: '40', 
            //     jusser: 'GL',
            //     origen: 'M',
            //     docser: mStrDocSer,
            //     punteo: 'N',
            //     placon: 'CH',
            //     cuenta: mRowSheet.E,
            //     codaux: 'RRHH',
            //     ctaaux: mRowSheet.F,
            //     contra: null,
            //     concep: mRowSheet.G,
            //     fecval: mRowSheet.K,
            //     moneda: 'PEN',
            //     divdeb: mRowSheet.M,
            //     divhab: mRowSheet.N,
            //     cambio: '1.000000',
            //     divemp: 'PEN',
            //     debe: mRowSheet.M,
            //     haber: mRowSheet.N,
            //     loteid: mIntLoteId,
            //     user_created: pStrUserName,
            //     user_updated: pStrUserName
            // });
        });
    } 
    /**
     * LOCAL FUNCTION: __validateGroupAux
     * 
     * Description: Función local que valida la existencia del grupo auxiliar RRHH.
     *      
     */ 
    function __validateGroupAux() { 
        /**
         * Validar la existencia del grupo auxiliar de RRHH.
         */
        var mIntExistGroupAux = Ax.db.executeGet(`
            <select>
                <columns>
                    COUNT(*)
                </columns>
                <from table='cctaauxh'/>
                <where>
                    cctaauxh.codaux = ?
                </where>
            </select> 
        `, 'RRHH'); 

        if (mIntExistGroupAux != 1) {
            /**
             * Insert del grupo auxiliar debido a su inexistencia.
             */
            Ax.db.insert("cctaauxh", {
                codaux: 'RRHH',
                desaux: 'RRHH'
            }); 
        }
    } 

    /**
     * LOCAL FUNCTION: __insCodEmp
     * 
     * Description: Función local que agrega los códigos de empleados al 
     *              auxiliar asociado a cuentas(t: cctaauxl)
     * 
     * PARAMETERS: 
     *      @param  {integer}   pIntLoteId      Identificador de lote
     */
    function __insCodEmp(pIntLoteId) { 
        /**
         * Agrupado de los códigos de empleado.
         */ 
        var mRsCtaAux = Ax.db.executeQuery(` 
            <select>
                <columns>
                    DISTINCT capuntes.ctaaux
                </columns>
                <from table='capuntes'/>
                <where>
                capuntes.loteid = ?;
                </where>
            </select>
        `, pIntLoteId); 

        /**
         * Recorrido de los códigos de empleado.
         */
        mRsCtaAux.forEach(mIntCtaAux => { 

            /**
             * Si no es null
             */
            if (mIntCtaAux.ctaaux !== null) { 
                /**
                 * Búsqueda si se encuentra ya registrado el código de empleado.
                 */
                var mIntExistCtaAux = Ax.db.executeGet(` 
                    <select>
                        <columns>
                            COUNT(*)
                        </columns>
                        <from table='cctaauxl'/>
                        <where>
                            cctaauxl.ctaaux = ?;
                        </where>
                    </select>
                `, mIntCtaAux.ctaaux); 

                /**
                 * Si la cantidad de registro es menor/igual a cero (No está registrado).
                 */
                if (mIntExistCtaAux <= 0) {
                    /**
                     * Insert del código de empleado en el registro auxiliar (cctaauxl).
                     */
                    Ax.db.insert("cctaauxl", {
                        codaux: 'RRHH',
                        ctaaux: mIntCtaAux.ctaaux,
                        desval: mIntCtaAux.ctaaux,
                        estado: 'A'
                    });
                } 
            } 
        }); 
    } 

    /**
     * LOCAL FUNCTION: __updFileStatus
     * 
     * Description: Función local que actualiza el estado del fichero.
     * 
     * PARAMETERS: 
     *      @param {string}     pStrStatus      Estado del fichero (P: Pendiente, C: Cargado, E: Error)
     *      @param {integer}    pIntLoteId      Identificador de lote
     *      @param {string}     pStrUserName    Usuario que realiza el proceso
     *      @param {integer}    pIntFileId      Identificador del fichero
     */
    function __updFileStatus(pStrStatus, pIntLoteId, pStrUserName, pIntFileId) { 
        /**
         * Update de estado de fichero.
         */
        Ax.db.update("crp_rrhh_file", 
        	{
	            file_status  : pStrStatus,
                loteid: pIntLoteId,
	            user_updated : pStrUserName,
	            date_updated : new Ax.util.Date()
	    	},
	    	{
	    		file_seqno : pIntFileId
	    	}
	    );
    }

    /**
     * Obtener la cantidad de archivos con el mismo número CRC de control.
     */ 
    var mIntExistFileLoad = Ax.db.executeGet(`
        <select>
            <columns>
                COUNT(*)
            </columns>
            <from table='crp_rrhh_file'/>
            <where>
                crp_rrhh_file.file_md5 = ?
            </where>
        </select> 
    `, pStrCRC); 

    /**
     * Validación de la existencia de más de un archivo.
     */
    if (mIntExistFileLoad > 1){
        throw new Ax.ext.Exception("El fichero con Id. [${fileId}] se encuentra duplicado.",{fileId : pIntFileId});
    } 

    // var mObjRRHHFile = Ax.db.executeGet(` 
    //     <select>
    //         <columns>
    //             crp_rrhh_file.file_data
    //         </columns>
    //         <from table='crp_rrhh_file'/>
    //         <where>
    //             crp_rrhh_file.file_seqno  = ?
    //         	AND crp_rrhh_file.file_status = 'P'
    //         </where>
    //     </select>
    // `, pIntFileId);

    var mObjRRHHFile = Ax.db.executeQuery(` 
        <select>
            <columns>
                crp_rrhh_file.file_data
            </columns>
            <from table='crp_rrhh_file'/>
            <where>
                crp_rrhh_file.file_seqno  = ?
            	AND crp_rrhh_file.file_status = 'P'
            </where>
        </select>
    `, pIntFileId).toOne();

    try{
        // var wb = Ax.ms.Excel.load(mObjRRHHFile);
        var blob = new Ax.sql.Blob();
        blob.setContent(mObjRRHHFile.file_data);

        var mRsSheet = new Ax.rs.Reader().csv(options => {
            options.setBlob(blob);
            options.setDelimiter(",");
            options.setHeader(true);
            options.setQuoteChar(7);
            options.setCharset("ISO-8859-15");
            // options.setColumnNameMapping(["DCODCOS", "DCTAGAS", "DCTACOS", "DVALCOM"]);
            //options.getFormats().setParser("pad_fecobl", Ax.rs.DataParser.ofSQLDate("MM/dd/yyyy"));
            // options.setColumnFilterMap("seqno", (src) => 0);
        })
    } catch(e){
        throw new Ax.ext.Exception("El documento NO presenta el formato de CSV. [${e}]",{e : e})
    }

    /**
     * Definición de variables.
     */    
    // var mXlsSheet = wb.getSheet(0);
    // mXlsSheet.removeRow(0);
    
    // var mIntLastRow = mXlsSheet.getLastRowNum();
    // var mRsSheet = mXlsSheet.toResultSet(); 

    var mStrUserName = Ax.db.getUser(); 
    var mIntLoteId = null;

    /**
     * Validación: Existencia de data a cargar.
     */
    // if (mIntLastRow < 1){
    //     throw new Ax.ext.Exception("No existen registros a cargar en la hoja de Excel"); 
    // }

    try { 
        Ax.db.beginWork();

        switch (pStrProc) {
            // Proceso Centro de Costos
            case 'C': 
                /**
                 * Insert de costos
                 */
                __insCosto(pIntFileId, mRsSheet, pStrTipProc, mStrUserName);

                /**
                 * Update del estado del fichero a Cargado (C)
                 */
                 __updFileStatus('C', mIntLoteId, mStrUserName, pIntFileId);
                break; 
            // Proceso Planillas
            case 'P': 
                /**
                 * Validar la existencia del grupo auxiliar de RRHH.
                 */
                __validateGroupAux();

                /**
                 * Insert de planillas
                 */
                __insPlanilla(mRsSheet, mStrUserName);

                /** 
                 * Registro de los códigos de empleados.
                 */
                __insCodEmp(); 

                /**
                 * Update del estado del fichero a Cargado (C)
                 */
                __updFileStatus('C', mIntLoteId, mStrUserName, pIntFileId);

                break;
        
            default:
                throw new Ax.ext.Exception('El tipo de proceso es no soportado.');
        } 

        Ax.db.commitWork();

    } catch(error) { 
        console.error(error);

        Ax.db.rollbackWork(); 
        /**
         * Update del estado del fichero a Cargado (C)
         */
        __updFileStatus('E', mIntLoteId, mStrUserName, pIntFileId);

        throw new Ax.ext.Exception("ERROR: [${error}]", {error});
    }

}


/**
 * SCRIPT PARA LEER ARCHIVOS CSV
 */
//  function pe_sunat_padron_reader_padron(pIntFileId) {
//     var mObjFilePadron = Ax.db.executeQuery(`
//         <select>
//             <columns>
//                 crp_rrhh_file.file_data
//             </columns>
//             <from table="crp_rrhh_file"/>
//             <where>
//                 crp_rrhh_file.file_seqno = ?
//             </where>
//         </select>
//     `, pIntFileId).toOne();

//     var blob = new Ax.sql.Blob();
//     blob.setContent(mObjFilePadron.file_data);

//     var rs = new Ax.rs.Reader().csv(options => {
//         options.setBlob(blob);
//         options.setDelimiter(",");
//         options.setHeader(true);
//         options.setQuoteChar(7);
//         options.setCharset("ISO-8859-15");
//         // options.setColumnNameMapping(["DCODCOS", "DCTAGAS", "DCTACOS", "DVALCOM"]);
//         //options.getFormats().setParser("pad_fecobl", Ax.rs.DataParser.ofSQLDate("MM/dd/yyyy"));
//         options.setColumnFilterMap("seqno", (src) => 0);
//     })
//     // console.log(rs.getColumnNameMapping());
//     console.log(rs)
//     rs.forEach(item => {
//         console.log(item)
//     })
// }
// var pIntFileId = 14;
// pe_sunat_padron_reader_padron(pIntFileId);