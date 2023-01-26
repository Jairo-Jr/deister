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
 *  Version     : v2.5
 *  Date        : 2023-01-26
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
 *      @param  {integer}   pIntFileRefno   Identificador del fichero de referencia. 
 * 
 */ 

 function crp_load_rrhh_file(pIntFileId, pStrCRC, pStrProc, pStrTipProc, pIntFileRefno) { 

    /**
     * LOCAL FUNCTION: __insTmpCosto
     * 
     * Description: Función local que registra los costos en Centro de Costos(t: crp_rrhh_asign), una tabla temporal de respaldo.
     * 
     * PARAMETERS:
     *      @param  {integer}       pIntFileId      Identificador de fichero
     *      @param  {ResultSet}     pRsSheet        ResultSet con la data del fichero
     *      @param  {string}        pStrTipProc     Nombre del tipo de proceso (EMP: Empleados, PRAC: Practicantes, PROV: Provisión)
     *      @param  {string}        pStrUserName    Usuario que realiza el registro
     */ 
    function __insTmpCosto(pIntFileId, pRsSheet, pStrTipProc, pStrUserName) {

        pRsSheet.forEach(mRowSheet => { 
            if(mRowSheet.A !== null){ 
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
                    user_created: pStrUserName,
                    user_updated: pStrUserName
                });
            } 
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
         * Se obtiene el número de asiento 'asient'.
         */ 
        mIntAsient = Ax.db.executeGet(`
            <select>
                <columns>
                    MAX(asient) max_asient
                </columns>
                <from table='capuntes'/>
            </select> 
        `) + 1; 

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

        var mIntNumOrden = 1;
        /**
         * Registro en Movimientos contables 'capuntes'.
         */
        pRsSheet.forEach(mRowSheet => { 
            /**
             * Validación de la primera columna no sea null.
             */
            if(mRowSheet.A !== null){ 
                /**
                 * Componer el número de documento según la nulidad de la serie y el comprobante.
                 */
                var mStrDocSer = (mRowSheet.I === null || mRowSheet.J === null) ? '-' : mRowSheet.I + '-' + mRowSheet.J;

                // Registro de planilla en 'capuntes'
                Ax.db.insert("capuntes", {
                    empcode: '001',                     // Código de Empresa
                    proyec: 'CRP0',                     // Línea de negocio
                    sistem: 'A',                        // Sistema
                    seccio: '0',                        // Sección
                    fecha: mRowSheet.C,                 // Fecha
                    asient: mIntAsient,                 // Número de asiento
                    diario: '40',                       // Código de diario
                    orden: mIntNumOrden++,              // Número de Orden
                    jusser: 'GL',                       // Justificante
                    origen: 'F',                        // Origen de apunte
                    docser: mStrDocSer,                 // Documento o número de factura
                    punteo: 'N',                        // Apunte auditado
                    placon: 'CH',                       // Plan contable
                    cuenta: mRowSheet.E,                // Cuenta contable
                    codaux: 'RRHH',                     // Grupo auxiliar
                    ctaaux: mRowSheet.F,                // Código auxiliar
                    contra: null,                       // Contrapartida
                    codcon: mObjCodCon[mRowSheet.H],    // Conceptos contables
                    concep: mRowSheet.G,                // Descripción del apunte
                    fecval: mRowSheet.K,                // Fecha de valor
                    moneda: 'PEN',                      // Moneda de transacción
                    divdeb: mRowSheet.M,                // Debe divisa
                    divhab: mRowSheet.N,                // Haber divisa
                    cambio: '1.000000',                 // Cambio
                    divemp: 'PEN',                      // Moneda de la empresa
                    debe: mRowSheet.M,                  // Debe
                    haber: mRowSheet.N,                 // Haber
                    loteid: mIntLoteId,                 // Identificador de lote
                    user_created: pStrUserName,
                    user_updated: pStrUserName
                });
            } 
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

        if (mIntExistGroupAux === 0) {
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
                if (mIntExistCtaAux === 0) {
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
     * LOCAL FUNCTION: __insMovCostes
     * 
     * Description: Función local que registra en Movimientos de costes (t: ccoscont) la data del fichero de costos según la planilla a la que corresponda.
     * 
     * PARAMETERS:
     *      @param {integer}        pIntFileRefno   Identificador de fichero del tipo planilla.
     *      @param {ResultSet}      pRsSheet        ResultSet con la data del fichero.
     *      @param {string}         pStrUserName    Usuario que realiza el proceso. 
     */
    function __insMovCostes(pIntFileRefno, pRsSheet, pStrUserName) { 
        /**
         * Búsqueda del identificador de lote del fichero de planilla.
         */
        var mIntLoteId = Ax.db.executeGet(`
            <select>
                <columns>
                    loteid
                </columns>
                <from table='crp_rrhh_file'/>
                <where>
                    crp_rrhh_file.file_seqno = ?
                </where>
            </select> 
        `, pIntFileRefno); 
        /**
         * Validar la existencia del identificador de lote (una planilla contabilizada).
         */
        if (mIntLoteId === null) {
            throw new Ax.ext.Exception("La planilla con Id. [${fileId}] a la que hace referencia no posee un lote contable.",{fileId : pIntFileRefno});
        } 

        /**
         * Iteración de las filas del fichero de costos.
         */ 
        pRsSheet.forEach(mRowSheet => {
            if(mRowSheet.A !== null){
                /**
                 * Obtener el equivalente de coste chavin (seccion axional)
                 */
                var mStrCodAx = Ax.db.executeGet(`
                    <select>
                        <columns>
                            seccio
                        </columns>
                        <from table='crp_chv_mapcen'/>
                        <where>
                            crp_chv_mapcen.cencos = ?
                        </where>
                    </select> 
                `, mRowSheet.C); 
                /**
                 * Validar la existencia de un equivalente al codigo de coste chavin
                 */
                if (mStrCodAx === null) {
                    throw new Ax.ext.Exception("El centro de coste Chavin [${codAx}] no posee una sección contable de destino.",{codAx : mRowSheet.C});
                } 

                /**
                 * Búsqueda en Apuntes de una planilla según el identificador de lote y el número de cuenta de gasto.
                 */ 
                var mObjApunte = Ax.db.executeQuery(`
                    <select first='1'>
                        <columns>
                            *
                        </columns>
                        <from table='capuntes'/>
                        <where>
                            loteid = ? 
                            AND cuenta = ?
                        </where>
                    </select> 
                `, mIntLoteId, mRowSheet.B).toOne();
                
                /**
                 * Insert en Apuntes de Costes (ccoscont)
                 */
                Ax.db.insert('ccoscont', {
                    empcode:  mObjApunte.empcode,       // Código de Empresa 
                    proyec:   mObjApunte.proyec,        // Línea de negocio 
                    seccio:   mRowSheet.C,              // Sección 
                    fecha:    mObjApunte.fecha,         // Fecha 
                    apteid:   mObjApunte.apteid,        // Identificador de apunte 
                    diario:   mObjApunte.diario,        // Código de diario 
                    jusser:   mObjApunte.jusser,        // Justificante 
                    docser:   mObjApunte.docser,        // Documento o número de factura 
                    sistem:   mObjApunte.sistem,        // Sistema 
                    placon:   mObjApunte.placon,        // Plan contable 
                    centro:   '0',                      /* DATO POR DEFINIR - TEMPORAL */
                    ctaexp:   '0',                      /* DATO POR DEFINIR - TEMPORAL */
                    cuenta:   mObjApunte.cuenta,        // Cuenta contable
                    dimcode1: mObjApunte.dimcode1,      // Dimensión 1
                    cantid1:  mObjApunte.cantid1,       // Cantidad 1
                    dimcode2: mObjApunte.dimcode2,      // Dimensión 2
                    cantid2:  mObjApunte.cantid2,       // Cantidad 2
                    codcon:   mObjApunte.codcon,        // Concepto
                    concep:   mObjApunte.concep,        // Descripción
                    porcen:   '100',                    /* DATO POR DEFINIR - TEMPORAL */
                    debe:     mRowSheet.D,              // Debe
                    haber:    '0',                      // Haber
                    user_created: pStrUserName,
                    user_updated: pStrUserName
                }); 
            } 
        });
    } 

    /**
     * LOCAL FUNCTION: __delFile
     * 
     * Description: Función local que elimina los archivos temporales usados como apoyo en el procesado de ficheros.
     * 
     */
    function __delFile() {
        mFileBiff5.delete();
        mFileBiff8.delete();
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
     * Validación del estado del fichero que se encuentre en Pendiente (P).
     */
    if (!mObjRRHHFile) { 
        throw new Ax.ext.Exception("El fichero con Id. [${fileId}] se encuentra en un estado distinto de Pendiente.",{fileId : pIntFileId});
    }

    try{ 
        // Creación de archivo .xls y se agrega la data (blob).
        var mFileBiff5 = new Ax.io.File("tmp/excel_biff5.xls"); 
        mFileBiff5.write(mObjRRHHFile); 
        var path = mFileBiff5.getAbsolutePath(); 

        // Creación de archivo .xls transformado a una nueva versión actualizada.
        let mStrPathNewFile = new Ax.io.File("tmp").getAbsolutePath() + `/excel_convert_${pIntFileId}.xls`;
        var mPB = new Ax.lang.ProcessBuilder(); 
        var mIntConverStatus = mPB.directory('/home/axional').command('/bin/bash', '-c', `./xlsx-cli.sh ${path} ${mStrPathNewFile}`); 

        // Validación de la correcta transformación del archivo.
        if (mIntConverStatus == 0) {

            // Se obtiene el nuevo archivo transformado a la nueva versión.
            var mFileBiff8 = new Ax.io.File(mStrPathNewFile); 
            
            // Carga del nuevo archivo.
            var wb = Ax.ms.Excel.load(mFileBiff8.toBlob());

        }
        else {
            console.log(mPB.getStdErr());
        } 

    } catch(e){
        throw new Ax.ext.Exception("El documento NO presenta el formato de excel. [${e}]",{e});
    }

    /**
     * Definición de variables.
     */    
    var mXlsSheet = wb.getSheet(0);
    mXlsSheet.removeRow(0);
    
    var mIntLastRow = mXlsSheet.getLastRowNum();    // Número de la última fila del fichero
    var mRsSheet = mXlsSheet.toResultSet();         // ResulSet con data del fichero
    var mStrUserName = Ax.db.getUser();             // Nombre de usuario
    var mIntLoteId = null;                          // Identificador de lote

    var mObjCodCon = {F: 'FV', B: 'BV'};            // Códigos de conceptos contables

    /**
     * Validación: Existencia de data a cargar.
     */
    if (mIntLastRow < 1){
        __delFile();
        throw new Ax.ext.Exception("No existen registros a cargar en la hoja de Excel"); 
    }

    try { 
        Ax.db.beginWork();

        switch (pStrProc) {
            // Proceso Centro de Costos
            case 'C': 
                /**
                 * Insert de costos
                 */ 
                __insTmpCosto(pIntFileId, mRsSheet, pStrTipProc, mStrUserName);

                /**
                 * Insert en Movimeintos de costes (ccoscont)
                 */ 
                __insMovCostes(pIntFileRefno, mRsSheet, mStrUserName);

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
                __insCodEmp(mIntLoteId); 

                /**
                 * Update del estado del fichero a Cargado (C)
                 */
                __updFileStatus('C', mIntLoteId, mStrUserName, pIntFileId);

                break;
        
            default:
                __delFile();
                throw new Ax.ext.Exception('El tipo de proceso es no soportado.');
        } 
        __delFile();
        Ax.db.commitWork();

    } catch(error) { 
        console.error(error);

        Ax.db.rollbackWork(); 
        /**
         * Update del estado del fichero a Cargado (C)
         */
        __updFileStatus('E', null, mStrUserName, pIntFileId); 
        __delFile();
        throw new Ax.ext.Exception("ERROR: [${error}]", {error});
    } 

}
