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
 *  Version     : v1.0
 *  Date        : 2023-01-10
 *  Description : Procesa ficheros .xls según el tipo de proceso (Costo/Planilla); 
 *                registra los Costos en la tabla de respaldo (crp_rrhh_asign) 
 *                y las planillas en los Mov. Contables (capuntes).
 * 
 *
 *
 *  CALLED FROM:
 * 
 *      Obj: crp_rrhh_file        Atravez de la accion 'ACTION_BTN_1'
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
     * LOCAL FUNCTION: __insCodEmp
     * 
     * Description: Función local que registra el codigo de empleado (en la tabla cctaauxl) 
     *              solo si no se encuentra previamente registrado 
     * 
     * PARAMETERS:
     *      @param  {Object}    pObjPlanilla    Objeto con informacion de la planilla
     *      @param  {integer}   pIntLoteId      Identificador de lote
     *      @param  {integer}   pIntRowNum      Numero de fila del fichero
     */ 
    function __insPlanilla(pObjPlanilla, pIntLoteId, pIntRowNum) {
        try{
            /**
             * Componer el número de documento según la nulidad de la serie y el comprobante. 
             */
             var mStrDocSer = (pObjPlanilla.I === null || pObjPlanilla.J === null) ? '-' : pObjPlanilla.I + '-' + pObjPlanilla.J;

             /**
             * Registro de las planillas en Apuntes 'capuntes'.
            */
            Ax.db.insert("capuntes", { 
                empcode: '001', 
                proyec: 'CRP0',
                sistem: 'A', 
                seccio: '0',
                fecha: pObjPlanilla.C,
                diario: '40', 
                jusser: 'GL',
                origen: 'M',
                docser: mStrDocSer,
                punteo: 'N',
                placon: 'CH',
                cuenta: pObjPlanilla.E, 
                codaux: 'RRHH',
                ctaaux: pObjPlanilla.F,
                contra: null,
                concep: pObjPlanilla.G,
                fecval: pObjPlanilla.K,
                moneda: 'PEN',
                divdeb: pObjPlanilla.M,
                divhab: pObjPlanilla.N,
                cambio: '1.000000',
                divemp: 'PEN',
                debe: pObjPlanilla.M,
                haber: pObjPlanilla.N,
                loteid: pIntLoteId,
                user_created: mStrUserName,
                user_updated: mStrUserName
            }); 
        } catch(error) { 
            /**
            * Si el codigo se encuentra registrado no es posible la insercion
            */
            console.error('Error al insertar la planilla: <Row# ', pIntRowNum, '> ', error);
        }
    }

    /**
     * LOCAL FUNCTION: __insCodEmp
     * 
     * Description: Función local que registra el codigo de empleado (en la tabla cctaauxl) 
     *              solo si no se encuentra previamente registrado 
     * 
     * PARAMETERS:
     *      @param   {integer}   pCodEmp   Código del empleado
     * 
     */ 
    function __insCodEmp(pCodEmp) {
        try{
            /**
             * Intento de insercion del codigo de empleado
             */
            Ax.db.insert("cctaauxl", {
                codaux: 'RRHH',
                ctaaux: pCodEmp,
                desval: pCodEmp,
                estado: 'A',
                user_created: mStrUserName,
                user_updated: mStrUserName
            });
        } catch(error) {
            /**
             * Si el codigo se encuentra registrado no es posible la insercion
             */
            console.error('Error al insertar codigo de empleado: <', pCodEmp, '> ', error);
        }
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

    /**
     * Obtención de la data del fichero según su identificador.
     */
    var mObjRRHHFile = Ax.db.executeGet(` 
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
    `, pIntFileId); 

    /**
     * Carga de la data del fichero a un workbook.
     */
    try{ 
        var wb = Ax.ms.Excel.load(mObjRRHHFile);
    } catch(e){
        throw new Ax.ext.Exception("El documento NO presenta el formato de excel. [${e}]",{e : e})
    }

    /**
     * Definición de variables
     */    
    var mXlsSheet = wb.getSheet(0);
    mXlsSheet.removeRow(0);
    
    var mIntLastRow = mXlsSheet.getLastRowNum();
    var mRsSheet = mXlsSheet.toResultSet(); 
    var mStrUserName = Ax.db.getUser(); 
    var mIntLoteId = null; 

    var mIntRowInit = 1;

    /**
     * Validación de la existencia de data dentro del workbook.
     */ 
    if (mIntLastRow < 1){
        throw new Ax.ext.Exception("No existen registros a cargar en la hoja de Excel"); 
    }

    try { 
        Ax.db.beginWork();

        /**
         * Si el proceso de registro es 'C' (Centro de costo).
         */
        if (pStrProc == 'C') {
            mRsSheet.forEach(mRowSheet => { 
                /**
                 * Se realiza la inserción a la tabla de respaldo.
                 */
                Ax.db.insert("crp_rrhh_asign", {
                    dcodcos : mRowSheet.A,
                    dctagas : mRowSheet.B,
                    dctacos : mRowSheet.C,
                    dvalcom : mRowSheet.D,
                    cod_axional : null,
                    tip_proc: pStrTipProc,
                    file_seqno: pIntFileId,
                    user_created: mStrUserName, 
                    user_updated: mStrUserName
                });

            });
        } 

        /**
         * Si el proceso de registro es 'P' (Planilla).
         */
        if (pStrProc == 'P') { 
            /**
             * Obtención del identificador de lote.
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
             * Recorrido de las filas del fichero.
             */
            mRsSheet.forEach(mRowSheet => { 

                /**
                 * Registro de planilla en Apuntes
                 */
                __insPlanilla(mRowSheet, mIntLoteId, mIntRowInit++);

                // /**
                //  * Componer el número de documento según la nulidad de la serie y el comprobante.
                //  */
                // var mStrDocSer = (mRowSheet.I === null || mRowSheet.J === null) ? '-' : mRowSheet.I + '-' + mRowSheet.J;

                // /**
                //  * Registro de las planillas en Apuntes 'capuntes'.
                //  */
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
                //     user_created: mStrUserName,
                //     user_updated: mStrUserName
                // }); 

                /**
                 * FIXME: Creacion de una fucnion
                 *      - Agrupar los codigo empleado diferentes en un arreglo
                 *      - Verificar la existencia del codigo de empleado en la tabla cctaauxl
                 *      - Inserta el codigo en la tabla cctaauxl
                 */ 
                __insCodEmp(mRowSheet.F); 
                 

            });

            /**
             * Agrupados de los códigos diferentes de empleados.
             */ 
            // var mRsCtaAux = Ax.db.executeQuery(` 
            //     <select>
            //         <columns>
            //             DISTINCT capuntes.ctaaux
            //         </columns>
            //         <from table='capuntes'/>
            //         <where>
            //         capuntes.loteid = ?;
            //         </where>
            //     </select>
            // `, mIntLoteId);

            // /**
            //  * Recorrido de los códigos de empleados.
            //  */
            // mRsCtaAux.forEach(mIntCtaAux => { 
            //     /**
            //      * Validación del código de empleado diferente de null.
            //      */
            //     if (mIntCtaAux.ctaaux !== null) { 
            //         /**
            //          * Búsqueda sí se encuentra ya registrado el código de empleado.
            //          */
            //         var mIntExistCtaAux = Ax.db.executeGet(` 
            //             <select>
            //                 <columns>
            //                     COUNT(*)
            //                 </columns>
            //                 <from table='cctaauxl'/>
            //                 <where>
            //                     cctaauxl.ctaaux = ?;
            //                 </where>
            //             </select>
            //         `, mIntCtaAux.ctaaux); 

            //         /**
            //          * Si la cantidad de registro es igual a cero (No se encuentra registrado).
            //          */
            //         if (mIntExistCtaAux == 0) {
            //             /**
            //              * Se realiza la inserción del código de empleado en el registro auxiliar (cctaauxl).
            //              */
            //             Ax.db.insert("cctaauxl", {
            //                 codaux: 'RRHH',
            //                 ctaaux: mIntCtaAux.ctaaux,
            //                 desval: mIntCtaAux.ctaaux,
            //                 estado: 'A',
            //                 user_created: mStrUserName,
            //                 user_updated: mStrUserName
            //             });
            //         } 
            //     } 
            // });

        } 

        /**
         * Se actualiza el estado (paso ha estado 'R' de registrado) y el número de lote al registro del fichero.
         */
        Ax.db.update("crp_rrhh_file", 
        	{
	            file_status  : 'R',
                loteid: mIntLoteId,
	            user_updated : mStrUserName,
	            date_updated : new Ax.util.Date()
	    	},
	    	{
	    		file_seqno : pIntFileId
	    	}
	    );

        Ax.db.commitWork();

    } catch(error) { 
        /**
         * Si existiese algún error al procesar el fichero, se realiza un rollback 
         * y la actualización del estado (paso a estado 'E' de error) al registro del fichero.
         */
        Ax.db.rollbackWork(); 

        Ax.db.update("crp_rrhh_file", 
        	{
	            file_status  : 'E',
	            user_updated : mStrUserName,
	            date_updated : new Ax.util.Date()
	    	},
	    	{
	    		file_seqno : pIntFileId
	    	}
	    );

        throw new Ax.ext.Exception("ERROR: [${error}]", {error});
    }

}
