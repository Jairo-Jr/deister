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
 *  Version     : v2.0
 *  Date        : 2023-01-11
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

    try{
        var wb = Ax.ms.Excel.load(mObjRRHHFile);
    } catch(e){
        throw new Ax.ext.Exception("El documento NO presenta el formato de excel. [${e}]",{e : e})
    }

    /**
     * Definición de variables.
     */    
    var mXlsSheet = wb.getSheet(0);
    mXlsSheet.removeRow(0);
    
    var mIntLastRow = mXlsSheet.getLastRowNum();
    var mRsSheet = mXlsSheet.toResultSet(); 
    var mStrUserName = Ax.db.getUser(); 
    var mIntLoteId = null;

    /**
     * Validación: Existencia de data a cargar.
     */
    if (mIntLastRow < 1){
        throw new Ax.ext.Exception("No existen registros a cargar en la hoja de Excel"); 
    }

    try { 
        Ax.db.beginWork();

        /**
         * Para el proceso del tipo Costo.
         */
        if (pStrProc == 'C') {
            mRsSheet.forEach(mRowSheet => { 
                /**
                 * Insert en la tabla de respaldo
                 */
                Ax.db.insert("crp_rrhh_asign", { 
                    file_seqno: pIntFileId,
                    dcodcos : mRowSheet.A,
                    dctagas : mRowSheet.B,
                    dctacos : mRowSheet.C,
                    dvalcom : mRowSheet.D,
                    tip_proc: pStrTipProc,
                    user_created: mStrUserName,
                    user_updated: mStrUserName
                });

            });
        } 

        /**
         * Para el proceso del tipo Planilla.
         */
        if (pStrProc == 'P') { 
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
            mRsSheet.forEach(mRowSheet => { 
                /**
                 * Componer el número de documento según la nulidad de la serie y el comprobante.
                 */
                var mStrDocSer = (mRowSheet.I === null || mRowSheet.J === null) ? '-' : mRowSheet.I + '-' + mRowSheet.J;

                // Registro de planilla en 'capuntes'
                Ax.db.insert("capuntes", {
                    empcode: '001', 
                    proyec: 'CRP0',
                    sistem: 'A', 
                    seccio: '0',
                    fecha: mRowSheet.C,
                    diario: '40', 
                    jusser: 'GL',
                    origen: 'M',
                    docser: mStrDocSer,
                    punteo: 'N',
                    placon: 'CH',
                    cuenta: mRowSheet.E,
                    codaux: 'RRHH',
                    ctaaux: mRowSheet.F,
                    contra: null,
                    concep: mRowSheet.G,
                    fecval: mRowSheet.K,
                    moneda: 'PEN',
                    divdeb: mRowSheet.M,
                    divhab: mRowSheet.N,
                    cambio: '1.000000',
                    divemp: 'PEN',
                    debe: mRowSheet.M,
                    haber: mRowSheet.N,
                    loteid: mIntLoteId,
                    user_created: mStrUserName,
                    user_updated: mStrUserName
                });
            });

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
            `, mIntLoteId);

            /**
             * Recorrido de los códigos de empleado.
             */
            mRsCtaAux.forEach(mIntCtaAux => {
                console.log(mIntCtaAux);

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
                            estado: 'A',
                            user_created: mStrUserName,
                            user_updated: mStrUserName
                        });
                    } 
                } 
            });

        } 

        /**
         * Update de estado de fichero.
         */
        Ax.db.update("crp_rrhh_file", 
        	{
	            file_status  : 'C',
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
        console.error(error);

        Ax.db.rollbackWork(); 

        /**
         * Update de estado de fichero.
         */
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
