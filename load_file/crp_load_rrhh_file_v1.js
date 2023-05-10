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
 *  Version     : v1.15
 *  Date        : 2023-05-10
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

    // ===============================================================
    //                        FUNCIONES LOCALES
    // ===============================================================

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

        // ===============================================================
        // Recorrido de la data del fichero de centro de costos.
        // ===============================================================
        pRsSheet.forEach(mRowSheet => {
            if(mRowSheet.A !== null){ 

                // ===============================================================
                // Registro en la tabla de respaldo.
                // ===============================================================
                Ax.db.insert("crp_rrhh_asign", {
                    file_seqno      : pIntFileId,
                    dcodcos         : mRowSheet.A,      // DCODCOS
                    dctagas         : mRowSheet.B,      // DCTAGAS
                    dctacos         : mRowSheet.C,      // DCTACOS
                    dvalcom         : mRowSheet.D,      // DVALCOM
                    tip_proc        : pStrTipProc,
                    user_created    : pStrUserName,
                    user_updated    : pStrUserName
                });
            }
        });
    }

    /**
     * LOCAL FUNCTION: __insPlanilla
     *
     * Description: Función local que registra las planillas en Movimientos contables (capuntes)
     *
     * PARAMETERS:
     *      @param  {ResultSet}     pRsSheet            ResultSet con la data del fichero de planilla.
     *      @param  {string}        pStrUserName        Usuario que realiza el registro.
     *
     */
    function __insPlanilla(pRsSheet, pStrUserName) { 

        // ===============================================================
        // Variables locales.
        // =============================================================== 
        var mObjMaximos        = null;
        var mIntAsient         = 0;
        var mIntLoteId         = 0;
        var mIntNumOrden       = 1; 
        var mStrDocSer         = '';
        var mBoolExistCefecto  = false;
        var mStrFecFactura;
        var mStrDocumento;
        var mDoubleImporte;

        // ===============================================================
        // Obtención de los números máximos de asientos 
        // e identificador de lote.
        // =============================================================== 
        mObjMaximos = Ax.db.executeQuery(`
            <select>
                <columns>
                    MAX(loteid) max_lote_id
                </columns>
                <from table='cenllote'/>
            </select>
        `).toOne(); 

        // ===============================================================
        // Generación del numero de asiento e identificador de lote.
        // ===============================================================
        mIntAsient = null;
        mIntLoteId = mObjMaximos.max_lote_id + 1; 

        // ===============================================================
        // Registro del Identificador de Lote
        // ===============================================================
        Ax.db.insert("cenllote", {
            loteid  : mIntLoteId,
            tabname : 'planilla'
        });

        // ===============================================================
        // Recorrido de la data del fichero de planilla.
        // ===============================================================
        pRsSheet.forEach(mRowSheetPln => { 

            // ===============================================================
            // Se procesa la planilla solo si las columnas del fichero 
            // correspondientes a TIPO_DOC, SERIE y COMPROBANTE, 
            // respectivamente, son diferentes de null.
            // ===============================================================
            if(mRowSheetPln.H != null && mRowSheetPln.I != null && mRowSheetPln.J != null) { 

                /* VALIDAR SI POSEE UN REGISTRO EN CEFECTOS */
                mStrFecFactura = mRowSheetPln.C;
                mStrDocumento  = mRowSheetPln.I + '-' + mRowSheetPln.J;
                mDoubleImporte = mRowSheetPln.N - mRowSheetPln.M;

                mBoolExistCefecto = __getExisteCefecto(mStrFecFactura, mStrDocumento, mDoubleImporte);

                // ===============================================================
                // Componer el número de documento con la SERIE (column I) y el COMPROBANTE (column J).
                // ===============================================================
                mStrDocSer = mRowSheetPln.I + '-' + mRowSheetPln.J; 
                
                // ===============================================================
                // registro del Movimiento contable (capuntes)
                // ===============================================================
                Ax.db.insert("capuntes", {
                    empcode         :   '001',                          // Código de Empresa
                    proyec          :   'CRP0',                         // Línea de negocio
                    sistem          :   'A',                            // Sistema
                    seccio          :   '0',                            // Sección
                    fecha           :   mRowSheetPln.C,                // Fecha
                    asient          :   mIntAsient,                    // Número de asiento
                    diario          :   '40',                           // Código de diario
                    orden           :   mIntNumOrden++,                // Número de Orden
                    jusser          :   'GL',                           // Justificante
                    origen          :   'F',                            // Origen de apunte
                    docser          :   mStrDocSer,                    // Documento o número de factura
                    punteo          :   'N',                            // Apunte auditado
                    placon          :   'CH',                           // Plan contable
                    cuenta          :   mRowSheetPln.E,                // Cuenta contable
                    codaux          :   'RRHH',                         // Grupo auxiliar
                    ctaaux          :   mRowSheetPln.F,                // Código auxiliar
                    contra          :   null,                           // Contrapartida
                    codcon          :   mObjCodCon[mRowSheetPln.H],    // Conceptos contables
                    concep          :   mRowSheetPln.G,                // Descripción del apunte
                    fecval          :   mRowSheetPln.K,                // Fecha de valor
                    moneda          :   'PEN',                          // Moneda de transacción
                    divdeb          :   mRowSheetPln.M,                // Debe divisa
                    divhab          :   mRowSheetPln.N,                // Haber divisa
                    cambio          :   '1.000000',                     // Cambio
                    divemp          :   'PEN',                          // Moneda de la empresa
                    debe            :   mRowSheetPln.M,                // Debe
                    haber           :   mRowSheetPln.N,                // Haber
                    loteid          :   mIntLoteId,                    // Identificador de lote
                    dimcode2        :   mBoolExistCefecto ? 0 : 14,    // Auxiliar 
                    user_created    :   pStrUserName,
                    user_updated    :   pStrUserName
                });
            } 
        });

        return mIntLoteId;
    }

    /**
     * LOCAL FUNCTION: __validateGroupAux
     *
     * Description: Función local que valida la existencia del grupo auxiliar RRHH.
     *
     */
    function __validateGroupAux() {

        // ===============================================================
        // Validar la existencia del grupo auxiliar de RRHH.
        // ===============================================================
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

        if (mIntExistGroupAux == 0) {

            // ===============================================================
            // Insert del grupo auxiliar debido a su inexistencia.
            // ===============================================================
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

        // ===============================================================
        // Variables locales.
        // =============================================================== 
        var mRsCtaAux          = null;
        var mIntExistCtaAux    = null;

        // ===============================================================
        // Se agrupan los códigos de empleados recién ingresados, 
        // según el código de lote.
        // ===============================================================
        mRsCtaAux = Ax.db.executeQuery(` 
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

        // ===============================================================
        // Iteración de los códigos de empleado.
        // ===============================================================
        mRsCtaAux.forEach(mIntCtaAux => {

            // ===============================================================
            // Si el código no es null
            // ===============================================================
            if (mIntCtaAux.ctaaux !== null) {

                // ===============================================================
                // Búsqueda del código de empleado en Códigos auxiliares (cctaauxl)
                // ===============================================================
                mIntExistCtaAux = Ax.db.executeGet(` 
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

                // ===============================================================
                // Si no se encuentra registrado.
                // ===============================================================
                if (mIntExistCtaAux == 0) {

                    // ===============================================================
                    // Se registra el código de empleado en Códigos auxiliares (cctaauxl).
                    // ===============================================================
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
     *      @param {integer}    pIntGestCartera Identificador de la gestión de cartera
     *      @param {string}     pStrUserName    Usuario que realiza el proceso
     *      @param {integer}    pIntFileId      Identificador del fichero
     */
    function __updFileStatus(pStrStatus, pIntLoteId, pIntGestCartera, pStrUserName, pIntFileId) {

        // ===============================================================
        // Update de estado de fichero.
        // ===============================================================
        Ax.db.update("crp_rrhh_file",
            {
                file_status  : pStrStatus,
                loteid       : pIntLoteId, 
                pcs_seqno    : pIntGestCartera,
                user_updated : pStrUserName,
                date_updated : mTodayDate
            },
            {
                file_seqno : pIntFileId
            }
        );
    }

    /**
     * LOCAL FUNCTION: __insMovCostes
     *
     * Description: Función local que registra en Movimientos de costes (ccoscont) la data 
     *              del fichero de costos según la planilla a la que corresponda.
     *
     * PARAMETERS:
     *      @param {integer}        pIntFileRefno   Identificador de fichero del tipo planilla.
     *      @param {ResultSet}      pRsSheet        ResultSet con la data del fichero.
     *      @param {string}         pStrUserName    Usuario que realiza el proceso.
     */
    function __insMovCostes(pIntFileRefno, pRsSheet, pStrUserName) { 

        // ===============================================================
        // Variables locales.
        // =============================================================== 
        var mIntPlanillaLoteId = null;
        var mStrCodAx = null;
        var mObjApunte = null;

        // ===============================================================
        // Búsqueda del identificador de lote del fichero de planilla 
        // al que hace referencia.
        // ===============================================================
        mIntPlanillaLoteId = Ax.db.executeGet(`
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

        // ===============================================================
        // Valida la existencia si el fichero de planilla posee 
        // un identificador de lote (Si se encuentra contabilizada).
        // ===============================================================
        if (mIntPlanillaLoteId === null) {
            throw new Ax.ext.Exception("La planilla con Id. [${fileId}] a la que hace referencia no posee un lote contable.",{fileId : pIntFileRefno});
        } 

        // ===============================================================
        // Recorrido de las filas del fichero de costos.
        // ===============================================================
        pRsSheet.forEach(mPlRowSheet => {
            if(mPlRowSheet.A !== null){

                // ===============================================================
                // Obtención del código equivalente de coste chavin
                // ===============================================================
                mStrCodAx = Ax.db.executeGet(`
                    <select>
                        <columns>
                            seccio
                        </columns>
                        <from table='crp_chv_mapcen'/>
                        <where>
                            crp_chv_mapcen.cencos = ?
                        </where>
                    </select> 
                `, mPlRowSheet.C);    // DCTACOS 

                // ===============================================================
                // Valida la existencia de un código equivalente de coste chavin
                // ===============================================================
                if (mStrCodAx === null) {
                    throw new Ax.ext.Exception("El centro de coste Chavin [${codAx}] no posee una sección contable de destino.",{codAx : mPlRowSheet.C});
                }

                // ===============================================================
                // Búsqueda de un Movimiento contable (capuntes) según 
                // el lote contable (mIntPlanillaLoteId) y el número de cuenta 
                // de gasto (DCTAGAS).
                // ===============================================================
                mObjApunte = Ax.db.executeQuery(`
                    <select first='1'>
                        <columns>
                            empcode,  proyec,  fecha,    apteid,
                            diario,   jusser,  docser,   sistem,
                            placon,   cuenta,  dimcode1, cantid1,
                            dimcode2, cantid2, codcon,   concep
                        </columns>
                        <from table='capuntes'/>
                        <where>
                            loteid = ? 
                            AND cuenta = ?
                        </where>
                    </select> 
                `, mIntPlanillaLoteId, mPlRowSheet.B).toOne(); 

                if (mObjApunte.apteid != null) { 
                    
                    // ===============================================================
                    // Registro en Apuntes de Costes (ccoscont)
                    // ===============================================================
                    Ax.db.insert('ccoscont', {
                        empcode         : mObjApunte.empcode,      // Código de Empresa
                        proyec          : mObjApunte.proyec,       // Línea de negocio
                        seccio          : mStrCodAx,               // Sección
                        fecha           : mObjApunte.fecha,        // Fecha
                        apteid          : mObjApunte.apteid,       // Identificador de apunte
                        diario          : mObjApunte.diario,       // Código de diario
                        jusser          : mObjApunte.jusser,       // Justificante
                        docser          : mObjApunte.docser,       // Documento o número de factura
                        sistem          : mObjApunte.sistem,       // Sistema
                        placon          : mObjApunte.placon,       // Plan contable
                        centro          : '0',                      /* DATO POR DEFINIR - TEMPORAL */
                        ctaexp          : '0',                      /* DATO POR DEFINIR - TEMPORAL */
                        cuenta          : mObjApunte.cuenta,       // Cuenta contable
                        dimcode1        : mObjApunte.dimcode1,     // Dimensión 1
                        cantid1         : mObjApunte.cantid1,      // Cantidad 1
                        dimcode2        : mObjApunte.dimcode2,     // Dimensión 2
                        cantid2         : mObjApunte.cantid2,      // Cantidad 2
                        codcon          : mObjApunte.codcon,       // Concepto
                        concep          : mObjApunte.concep,       // Descripción
                        porcen          : '100',                    /* DATO POR DEFINIR - TEMPORAL */
                        debe            : mPlRowSheet.D,           // Debe
                        haber           : '0',                      // Haber
                        user_created    : pStrUserName,
                        user_updated    : pStrUserName
                    });
                }
            }
        });

        return mIntPlanillaLoteId;
    } 

    /**
     * LOCAL FUNCTION: __validateFile
     *
     * Description: Función local que valida el CODIGO CRC y estado del fichero. 
     *
     */
    function __validateFile() { 

        // ===============================================================
        // Variables locales.
        // ===============================================================
        var mIntExistFileLoad = 0;     // Número de archivos cargados con igual CRC. 

        // ===============================================================
        // Obtener la cantidad de archivos con el mismo número CRC 
        // de control y en estado '1' (En contabilidad)
        // ===============================================================
        mIntExistFileLoad = Ax.db.executeGet(`
        <select>
                <columns>
                    COUNT(*)
                </columns>
                <from table='crp_rrhh_file'/>
                <where>
                    crp_rrhh_file.file_md5 = ?
                    AND file_status = '1'
                </where>
            </select> 
        `, pStrCRC); 

        // ===============================================================
        // Validación de la existencia de más de un fichero 
        // en estado (1) y el mismo número CRC.
        // ===============================================================
        if (mIntExistFileLoad >= 1){
            throw new Ax.ext.Exception("El fichero con Id. [${fileId}] se encuentra duplicado y en estado 'En contabilidad'",{fileId : pIntFileId});
        }

        // ===============================================================
        // Obtener la data del fichero que se encuentre 
        // en estado '0' (Pendiente)
        // ===============================================================
        mObjRRHHFile = Ax.db.executeGet(` 
            <select>
                <columns>
                    crp_rrhh_file.file_data
                </columns>
                <from table='crp_rrhh_file'/>
                <where>
                    crp_rrhh_file.file_seqno  = ?
                    AND crp_rrhh_file.file_status = '0'
                </where>
            </select>
        `, pIntFileId); 

        // ===============================================================
        // Validación del fichero que se encuentre en estado '0' (Pendiente).
        // ===============================================================
        if (!mObjRRHHFile) {
            throw new Ax.ext.Exception("El fichero con Id. [${fileId}] se encuentra en un estado distinto de Pendiente.",{fileId : pIntFileId});
        } 
     
    }

    /**
     * LOCAL FUNCTION: __fileTransformation
     *
     * Description: Función local que transforma el fichero de Biff5 a Biff8.
     *
     */
    function __fileTransformation() { 

        // ===============================================================
        // Variables locales
        // ===============================================================
        var mStrPath           = null;     // Ruta del fichero Biff5
        let mStrPathNewFile    = null;     // Ruta del fichero Biff8
        var mPB                = null;     // Procesador Biff5
        var mIntConverStatus   = null;     // Estado de conversión
        var mObjWorkbook       = null;     // Fichero de planilla

        try{
            
            // ===============================================================
            // Creación de archivo .xls y se agrega la data (blob).
            // ===============================================================
            mFileBiff5 = new Ax.io.File("tmp/excel_biff5.xls");
            mFileBiff5.write(mObjRRHHFile);
            mStrPath = mFileBiff5.getAbsolutePath();
    
            // ===============================================================
            // Creación de archivo .xls transformado a una nueva 
            // versión actualizada.
            // ===============================================================
            mStrPathNewFile    = new Ax.io.File("tmp").getAbsolutePath() + `/excel_convert_${pIntFileId}.xls`;
            mPB                = new Ax.lang.ProcessBuilder();
            mIntConverStatus   = mPB.directory('/home/axional').command('/bin/bash', '-c', `./xlsx-cli.sh ${mStrPath} ${mStrPathNewFile}`);
    
            // ===============================================================
            // Validación de la correcta transformación del archivo.
            // ===============================================================
            if (mIntConverStatus == 0) {

                // ===============================================================
                // Se obtiene el nuevo archivo transformado a la nueva versión.
                // ===============================================================
                mFileBiff8 = new Ax.io.File(mStrPathNewFile);
    
                // ===============================================================
                // Carga del nuevo archivo.
                // ===============================================================
                mObjWorkbook = Ax.ms.Excel.load(mFileBiff8.toBlob()); 
            }
            else {

                throw new Ax.ext.Exception("Error workbook: [${eWB}]",{eWB: mPB.getStdErr()});
            }
        } catch(e){
            throw new Ax.ext.Exception("El documento NO presenta el formato de excel. [${e}]",{e});
        }

        return mObjWorkbook;
     
    }

    /**
     * LOCAL FUNCTION: __insCarteraEfectos
     *
     * Description: Función local que registra la cabecera para la Cartera de Efectos. 
     *
     */
    function __insCarteraEfectos(pTodayDate) { 

        // ===============================================================
        // Se genera la cabecera para la Cartera de Efectos solo para 
        // los procesos de Empleados (EMP) y Practicantes (PRAC). 
        // Para el caso de Provisión (PROV) se lanza una excepción.
        // ===============================================================
        /*if (pStrTipProc == 'PROV') { 
            throw new Ax.ext.Exception('No es posible generar Cartera de Efectos para el proceso de Provisión');
            
        } */

        var _mIntSerial = Ax.db.insert("cefecges_pcs",
            { 
                pcs_empcode : '001',         // Código de empresa.
                pcs_proyec  : 'CRP0',        // Código de proyecto.
                pcs_seccio  : '0',           // Sección contable
                pcs_clase   : 'C',           // Clase de cartera
                pcs_accion  : 'CPLN',        // Código de acción asociada al proceso
                pcs_ctafin  : 'PR00CRPCH',   // Cuenta financiera
                pcs_moneda  : 'PEN',         // Moneda
                pcs_cambio  : '1',           // Cambio de divisa
                pcs_fecpro  : pTodayDate,    // Fecha del proceso
                pcs_estado  : 'A',           // Estado del proceso
                pcs_tipgen  : 1            // Tipo de gestion
            }
        ).getSerial(); 
        
        return _mIntSerial;
    }

    /**
     * LOCAL FUNCTION: __insDetallesCarteraEfectos
     *
     * Description: Función local que asigna detalles a la Cartera de Efectos
     *
     *      @param   {Integer}      pIntIdCarteraEfectos            Identificador de la Cartera de Efectos.
     *      @param   {ResultSet}    pRsSheetPln                     Resultset con la data de la planilla.
     *
     */
    function __insDetallesCarteraEfectos(pIntIdCarteraEfectos, pRsSheetPln) { 
        // var mIntIdCartera = __insCarteraEfectos();
        // ===============================================================
        // Variables locales
        // =============================================================== 
        var mObjEfectos        = null;     // Cartera de Efectos
        var mStrFecFactura     = null;     // Fecha de factura
        var mStrDocumento      = null;     // Documento o número de factura 
        var mDoubleImporte     = null;     // Importe local 
        var cefecges_pcsImpdiv = 0;        // Importe de divisas
        var cefecges_pcsTotimp = 0;        // Importe total
        var mIntNumOrden       = 1;        // Número de orden del Efecto 

        // ===============================================================
        // Recorrido de las filas del fichero de planilla.
        // ===============================================================
        for(var mRowFilePln of pRsSheetPln) { 
            
            // ===============================================================
            // Se procesa la planilla solo si las columnas del fichero 
            // correspondientes a TIPO_DOC, SERIE y COMPROBANTE, 
            // respectivamente, son diferentes de null.
            // ===============================================================
            if(mRowFilePln.H != null && mRowFilePln.I != null && mRowFilePln.J) { 

                mStrFecFactura = mRowFilePln.C;
                mStrDocumento  = mRowFilePln.I + '-' + mRowFilePln.J;
                mDoubleImporte = mRowFilePln.N - mRowFilePln.M;

                // ===============================================================
                // Busqueda de la cartera de efectos correspondiente 
                // a la fila del fichero de planilla.
                // ===============================================================
                mObjEfectos = Ax.db.executeQuery(`
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


                            (SELECT COUNT(*)
                                FROM cefecges_pcs g, cefecges_det d
                                WHERE g.pcs_empcode = '001'
                                    AND g.pcs_fecpro >= (SELECT MIN(s.fecini) 
                                                        FROM cperiodo s 
                                                        WHERE s.empcode = '001' 
                                                            AND s.estado  = 'A')
                                    AND g.pcs_seqno   = d.pcs_seqno
                                    AND g.pcs_estado  = 'A'
                                    AND d.det_numero  = cefectos.numero) cefectos_in_gestion, 

                            CASE WHEN cefectos.clase = 'C' 
                                 THEN +cefectos.impdiv 
                                 ELSE -cefectos.impdiv 
                            END pcs_totimp

                        </columns>
                        <from table='cefectos'/>
                        <where>
                            clase = 'C' 
                            AND tercer = '00000021' 
                            AND estado = 'PE' 
                            AND fecha &lt;= ?   
                            AND docser = ?
                            AND import = ?
                        </where>
                    </select>
                `, mStrFecFactura, mStrDocumento, mDoubleImporte).toOne(); 
                
                // throw new Ax.ext.Exception("ID: [${id}]", {id: mObjEfectos.cefectos_in_gestion});
                // ===============================================================
                // Validar que el efecto no se encuentre registrado 
                // como gestion de otra Cartera.
                // ===============================================================
                // if (mObjEfectos.cefectos_in_gestion == 0) {
                
                if(mObjEfectos.cefectos_in_gestion == null) {
                    continue;
                }
                
                if( Ax.math.bc.compareTo(mObjEfectos.cefectos_in_gestion, 0) == 0 ) {
                    
                    
                   // ===============================================================
                   // El valor de cefectos_impdiv viene devuelto según la transformación
                   // realizada desde el objeto cefectos_sel , la cual permite procesar
                   // grupos de efectos de ambos tipos de carteras, esto es :
                   // 
                   //       case clase = 'C' then +impdiv else -impdiv end
                   // 
                   // En este punto los importes deben adquirir de nuevo su signo según se
                   // expresa en el registro de la tabla cefectos, que a dia de hoy, es decir
                   // la versión actual , en ambas carteras se registran en signo positivo las
                   // facturas y en signo negativo los abonos. 
                   // ===============================================================
                    if (mObjEfectos.clase == 'P') {
                        mObjEfectos.impdiv     = - mObjEfectos.impdiv;
                        mObjEfectos.import     = - mObjEfectos.import;
                        mObjEfectos.pcs_totimp = - mObjEfectos.pcs_totimp;            
                    }

                    mObjEfectos.pcs_seqno  = pIntIdCarteraEfectos;
                    mObjEfectos.det_numero = mObjEfectos.numero;
                    mObjEfectos.det_impdiv = mObjEfectos.impdiv;
                    mObjEfectos.det_import = mObjEfectos.import;
                    mObjEfectos.ori_numero = mObjEfectos.numero;
                    mObjEfectos.cabid      = mObjEfectos.cabid;
                    mObjEfectos.apteid     = 0;
                    mObjEfectos.rowenl     = pIntIdCarteraEfectos;
                    mObjEfectos.estcon     = 'N';
                    mObjEfectos.det_agrupa = mIntNumOrden++; 
                    
                    Ax.db.insert("cefecges_det", mObjEfectos); 

                    cefecges_pcsImpdiv = Ax.math.bc.add(cefecges_pcsImpdiv, mObjEfectos.det_impdiv);
                    cefecges_pcsTotimp = Ax.math.bc.add(cefecges_pcsTotimp, mObjEfectos.pcs_totimp); 

                    Ax.db.execute(`
                        UPDATE cefecges_pcs
                        SET pcs_impdiv = ${cefecges_pcsImpdiv},
                            pcs_totimp = ${cefecges_pcsTotimp}
                        WHERE pcs_seqno = ?
                    `, pIntIdCarteraEfectos);
                    
                } 
                
            }
        };
    }

    /**
     * LOCAL FUNCTION: __delFile
     *
     * Description: Función local que elimina los archivos temporales usados como apoyo en el procesado de ficheros.
     *
     */
    function __delFile() {

        // ===============================================================
        // Eliminación de ficheros de apoyo temporales.
        // ===============================================================
        mFileBiff5.delete();
        mFileBiff8.delete();
    }
    
    /**
     * LOCAL FUNCTION: __getExisteCefecto
     *
     * Description: ----
     *
     */
    function __getExisteCefecto(pStrFecFactura, pStrDocumento, pDoubleImporte) {
        var mBoolExist = false;
        // ===============================================================
        // Busqueda de la cartera de efectos correspondiente 
        // a la fila del fichero de planilla.
        // ===============================================================
        var mObjEfectos = Ax.db.executeQuery(`
            <select first='1'>
                <columns>
                    (SELECT COUNT(*)
                        FROM cefecges_pcs g, cefecges_det d
                        WHERE g.pcs_empcode = '001'
                            AND g.pcs_fecpro >= (SELECT MIN(s.fecini) 
                                                FROM cperiodo s 
                                                WHERE s.empcode = '001' 
                                                    AND s.estado  = 'A')
                            AND g.pcs_seqno   = d.pcs_seqno
                            AND g.pcs_estado  = 'A'
                            AND d.det_numero  = cefectos.numero) cefectos_in_gestion

                </columns>
                <from table='cefectos'/>
                <where>
                    clase = 'C' 
                    AND tercer = '00000021' 
                    AND estado = 'PE' 
                    AND fecha &lt;= ?   
                    AND docser = ?
                    AND import = ?
                </where>
            </select>
        `, pStrFecFactura, pStrDocumento, pDoubleImporte).toOne(); 

        if (mObjEfectos.cefectos_in_gestion == 0) {
            mBoolExist = true;
        }
        return mBoolExist;
    }

    // ===============================================================
    //                  INICIO DE LA TRANSACCION
    // =============================================================== 

    // ===============================================================
    // Definición de variables globales
    // =============================================================== 
    var mFileBiff5              = null;                     // Fichero de apoyo temporal con version Biff5
    var mFileBiff8              = null;                     // Fichero de apoyo temporal con version Biff8
    // var mIntLoteId              = null;                     // Identificador de lote
    var mStrUserName            = Ax.db.getUser();          // Nombre de usuario 
    var mObjRRHHFile            = null;                     // Objeto con data del fichero cargado
    var mTodayDate              = new Ax.util.Date();       // Fecha actual
    var wb                      = null;                     // Excel workbook
    var mXlsSheet               = null;                     // Excel sheet
    var mIntLastRow             = null;                     // Número de la ultima fila del fichero.
    var mObjCodCon              = {F: 'FV', B: 'BV'};       // Códigos de conceptos contables
    var mIntIdCarteraEfectos    = null;                     // Identificador de la Cartera de Efectos. 

    // ===============================================================
    // Se valida el estado y el número CRC del fichero.
    // ===============================================================
    __validateFile(); 

    // ===============================================================
    // Transformación del fichero a Biff8
    // =============================================================== 
    wb = __fileTransformation(); 
    
    mXlsSheet = wb.getSheet(0);                 // Se obtiene la primera hoja de datos.
    mXlsSheet.removeRow(0);                     // Se elimina la primera fila, correspondiente a nombre de columnas.
    
    mIntLastRow = mXlsSheet.getLastRowNum();    // Número de la última fila del fichero
    mRsSheet    = mXlsSheet.toResultSet();      // ResulSet con data del fichero 

    // ===============================================================
    // Se valida la existencia de registros a cargar.
    // ===============================================================
    if (mIntLastRow < 1){
        __delFile();
        throw new Ax.ext.Exception("No existen registros a cargar en la hoja de Excel");
    } 

    try {
        Ax.db.beginWork();
        switch (pStrProc) { 
            // ===============================================================
            // Proceso Centro de Costos
            // ===============================================================
            case 'C':
                
                // ===============================================================
                // Registro de costos
                // ===============================================================
                __insTmpCosto(pIntFileId, mRsSheet, pStrTipProc, mStrUserName); 

                // ===============================================================
                // Registro de costos en Movimientos de costes (ccoscont)
                // ===============================================================
                var mIntLoteIdC = __insMovCostes(pIntFileRefno, mRsSheet, mStrUserName); 

                // ===============================================================
                // Actualizado del estado del fichero a En contabilidad (1)
                // ===============================================================
                __updFileStatus('1', mIntLoteIdC, null, mStrUserName, pIntFileId);
                
                break;

            // ===============================================================
            // Proceso Planilla
            // ===============================================================
            case 'P': 

                // ===============================================================
                // Validar la existencia del grupo auxiliar de RRHH
                // ===============================================================
                __validateGroupAux(); 

                // ===============================================================
                // Registro de planillas
                // ===============================================================
                var mIntLoteId = __insPlanilla(mRsSheet, mStrUserName); 
                
                var mIntContCapuntes = Ax.db.executeGet(`
                            SELECT COUNT(*) 
                              FROM capuntes 
                              WHERE loteid = ?
                        `, mIntLoteId);
                
                if (mIntContCapuntes > 0) {
                    // ===============================================================
                    // Registro de los códigos de empleados.
                    // ===============================================================
                    __insCodEmp(mIntLoteId);
    
                    // ===============================================================
                    // Se registra la Gestion de Cartera de Efectos (cefecges_pcs).
                    // ===============================================================
                    var mIntIdCarteraEfectos = __insCarteraEfectos(mTodayDate); 
    
                    if(mIntIdCarteraEfectos) {
                        
                        // ===============================================================
                        // Se registra los detalles (lineas) de la Cartera
                        // de Efectos (cefecges_det).
                        // ===============================================================
                        __insDetallesCarteraEfectos(mIntIdCarteraEfectos, mRsSheet);
                        
                        var mIntLineasExist = Ax.db.executeGet(`
                            SELECT COUNT(*) 
                              FROM cefecges_det 
                              WHERE pcs_seqno = ?
                        `, mIntIdCarteraEfectos); 
                        
                        if(mIntLineasExist == 0 ) {
                            Ax.db.execute(`
                                DELETE FROM cefecges_pcs WHERE pcs_seqno = ?
                            `, mIntIdCarteraEfectos);
                            
                            __updFileStatus('1', mIntLoteId, null, mStrUserName, pIntFileId);
                        }
                        
                        if(mIntLineasExist > 0 ) {
                            // ===============================================================
                            // Se cierra la gestión de cartera
                            // ===============================================================
                            
                            // Ax.db.call("cefecges_estado_ava", mIntIdCarteraEfectos, 0);
            
                            // ===============================================================
                            // Update del estado del fichero a En contabilidad (1)
                            // ===============================================================
                            __updFileStatus('1', mIntLoteId, mIntIdCarteraEfectos, mStrUserName, pIntFileId);
                        }
                    }
                } else {
                    throw new Ax.ext.Exception('Revisar que las columnas TIP_DOC, SERIE y COMPROBANTE esten informadas en el fichero a cargar ');
                } 

                break;

            default:
                __delFile();
                throw new Ax.ext.Exception('El tipo de proceso es no soportado.');
        }

        // ===============================================================
        // Eliminado de ficheros de apoyo temporales.
        // ===============================================================
        __delFile();

        Ax.db.commitWork();
    } catch(error) { 

        Ax.db.rollbackWork();

        // ===============================================================
        // Update del estado del fichero a Error (3)
        // ===============================================================
        __updFileStatus('3', null, null, mStrUserName, pIntFileId);

        // ===============================================================
        // Se elimina los archivos temporales usados como apoyo 
        // en el procesado de lectura de ficheros.
        // ===============================================================
        __delFile();

        throw new Ax.ext.Exception("ERROR: [${error}]", {error});
    }
}