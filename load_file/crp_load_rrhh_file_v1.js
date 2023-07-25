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
 *  Version     : v1.13
 *  Date        : 2023-05-15
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
    
    function __getTempTable (pStrTmpTable, pBoolDropTable) {
        
        let mTmpTable = Ax.db.getTempTableName(`${pStrTmpTable}`);
        
        if (pBoolDropTable) {
            Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable}`);
        }
        
        return mTmpTable;
    }   

    /**
     * LOCAL FUNCTION: __insTmpCosto
     *
     * Función local que registra los costos en Centro de Costos(t: crp_rrhh_asign), una tabla temporal de respaldo.
     *
     *      @param  {integer}       pIntFileId      Identificador de fichero
     *      @param  {ResultSet}     pRsSheet        ResultSet con la data del fichero
     *      @param  {string}        pStrTipProc     Nombre del tipo de proceso (EMP: Empleados, PRAC: Practicantes, PROV: Provisión)
     */
    function __insTmpCosto(pIntFileId, pRsSheet, pStrTipProc) {
        
        var mStrUserCode = Ax.db.getUser();
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
                    user_created    : mStrUserCode,
                    user_updated    : mStrUserCode
                });
            }
        });
    }

    /**
     * LOCAL FUNCTION: __insPlanilla
     *
     * Función local que registra las planillas en Movimientos contables (capuntes)
     *
     *      @param  {ResultSet}     pRsSheet            ResultSet con la data del fichero de planilla.
     */
    function __insPlanilla(pRsSheet) { 

        var mIntLoteId        = 0;
        var mIntNumOrden      = 1; 
        var mStrDocSer        = '';
        var mBoolExistCefecto = false;
        var mObjCodCon        = {F: 'FV', B: 'BV'};       // Códigos de conceptos contables
        var mStrUserCode      = Ax.db.getUser();
        var mArrObjPlanilla   = [];
        var mTmpPlanilla      = __getTempTable('tmp_planilla', true);

        Ax.db.execute(`
                CREATE TEMP TABLE ${mTmpPlanilla} (
                    indicador     CHAR (8),
                    ref           CHAR (5),
                    fecha         DATE,
                    cheque        VARCHAR (20),
                    cuenta        VARCHAR (20),
                    empleado      VARCHAR (20),
                    glosa         VARCHAR (250),
                    tip_doc       CHAR (10),
                    serie         CHAR (10),
                    comprobante   VARCHAR (20),
                    fechadocu     DATE,
                    fechavenc     DATE,
                    debe          DECIMAL (16,7),
                    haber         DECIMAL (16,7)
                )
                WITH NO LOG;
            `);

        // ===============================================================
        // Recorrido de la data del fichero de planilla.
        // ===============================================================
        pRsSheet.forEach(mRowSheetPln => { 
            
            if(mRowSheetPln.A != null){

                mArrObjPlanilla.push(
                    {
                        indicador   : mRowSheetPln.A,
                        ref         : mRowSheetPln.B,
                        fecha       : mRowSheetPln.C,                                                 
                        cheque      : mRowSheetPln.D,
                        cuenta      : mRowSheetPln.E,
                        empleado    : mRowSheetPln.F,
                        glosa       : mRowSheetPln.G,
                        tip_doc     : mRowSheetPln.H,
                        serie       : mRowSheetPln.I,
                        comprobante : mRowSheetPln.J,
                        fechadocu   : mRowSheetPln.K,
                        fechavenc   : mRowSheetPln.L,
                        debe        : mRowSheetPln.M,
                        haber       : mRowSheetPln.N
        			}
                );
            }
        });
        
        Ax.db.insert(`${mTmpPlanilla}`, mArrObjPlanilla);
        
        var mObjCuadrado =  Ax.db.executeQuery(`
            <select>
                <columns>
                      fecha,
                      SUM(haber) sum_haber,
                      SUM(debe)  sum_debe
                </columns>
                <from table='${mTmpPlanilla}' />
                <group>
                    1
                </group>
            </select>
        `).toOne();
        
        if(Ax.math.bc.compareTo(mObjCuadrado.sum_haber, mObjCuadrado.sum_debe) != 0){
            
            throw `Planilla descuadrada. Verificar, corregir y volver a cargar`;
        }

        // ===============================================================
        // Registro de los códigos de empleados.
        // ===============================================================
        __insCodEmpleado(mTmpPlanilla);
        
        // ===============================================================
        // Generación del numero de identificador de lote.
        // =============================================================== 
        var mIntLoteId = Ax.db.executeGet(`
            <select>
                <columns>
                    MAX(loteid) +1
                </columns>
                <from table='cenllote'/>
            </select>
        `); 

        // ===============================================================
        // Registro del Identificador de Lote
        // ===============================================================
        Ax.db.insert("cenllote", {
            loteid  : mIntLoteId,
            tabname : 'planilla'
        });
        
        var mRsPlanillaAgrupada = Ax.db.executeQuery(`
            <select>
                <columns>
                    DISTINCT(glosa),
                    fecha,
                    cuenta,
                    tip_doc,
                    serie,
                    comprobante,
                    empleado,
                    indicador,
                    SUM(haber) sum_haber,
                    SUM(debe) sum_debe
                </columns>
                <from table='${mTmpPlanilla}' />
                <group>
                    1,2,3,4,5,6,7,8
                </group>
            </select>
        `);
        
        var i = 0;
        for(var mRowPlanilla of mRsPlanillaAgrupada){
            
            if(mRowPlanilla.tip_doc != null && mRowPlanilla.serie != null && mRowPlanilla.comprobante != null) { 
                /* VALIDAR SI POSEE UN REGISTRO EN CEFECTOS */
                var mStrFecFactura = mRowPlanilla.fecha;
                var mStrDocumento  = mRowPlanilla.serie + '-' + mRowPlanilla.comprobante;
                var mBcImporte     = Ax.math.bc.sub(mRowPlanilla.sum_haber, mRowPlanilla.sum_debe);
                
                mBoolExistCefecto = __getExisteCefecto(mStrFecFactura, mStrDocumento, mBcImporte);
                
            }
            
            // ===============================================================
            // registro del Movimiento contable (capuntes)
            // ===============================================================
            Ax.db.insert("capuntes", {
                empcode         :   '001',                          // Código de Empresa
                proyec          :   'CRP0',                         // Línea de negocio
                sistem          :   'A',                            // Sistema
                seccio          :   '0',                            // Sección
                fecha           :   mRowPlanilla.fecha,             // Fecha
                asient          :   null,                           // Número de asiento
                diario          :   '40',                           // Código de diario
                orden           :   mIntNumOrden++,                 // Número de Orden
                jusser          :   'GL',                           // Justificante
                origen          :   'F',                            // Origen de apunte
                docser          :   mStrDocumento != null ? mStrDocumento : null,                  // Documento o número de factura
                punteo          :   'N',                            // Apunte auditado
                placon          :   'CH',                           // Plan contable
                cuenta          :   mRowPlanilla.cuenta,            // Cuenta contable
                codaux          :   'RRHH',                         // Grupo auxiliar
                ctaaux          :   mRowPlanilla.empleado,          // Código auxiliar
                contra          :   null,                           // Contrapartida
                codcon          :   mObjCodCon[mRowPlanilla.tip_doc] != null ? mObjCodCon[mRowPlanilla.tip_doc] : null,    // Conceptos contables
                concep          :   mRowPlanilla.glosa,             // Descripción del apunte
                fecval          :   mRowPlanilla.fecha,             // Fecha de valor
                moneda          :   'PEN',                          // Moneda de transacción
                divdeb          :   mRowPlanilla.sum_debe,              // Debe divisa
                divhab          :   mRowPlanilla.sum_haber,             // Haber divisa
                cambio          :   1.000000,                       // Cambio
                divemp          :   'PEN',                          // Moneda de la empresa
                debe            :   mRowPlanilla.sum_debe,              // Debe
                haber           :   mRowPlanilla.sum_haber,             // Haber
                loteid          :   mIntLoteId,                     // Identificador de lote
                dimcode2        :   mBoolExistCefecto ? 0 : 14,     // Auxiliar 
                user_created    :   mStrUserCode,
                user_updated    :   mStrUserCode
            });
            
            //throw `mRowPlanilla: ${mRowPlanilla.cuenta} || mIntSerial ${mIntSerial}`;
        }
        
        return mIntLoteId;
    }

    /**
     * LOCAL FUNCTION: __validateGroupAux
     *
     * Función local que valida la existencia del grupo auxiliar RRHH.
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
     * LOCAL FUNCTION: __updFileStatus
     *
     * Función local que actualiza el estado del fichero.
     *
     *      @param {string}     pStrStatus      Estado del fichero (0: Pendiente, 1: Cargado, 3: Error)
     *      @param {integer}    pIntLoteId      Identificador de lote
     *      @param {integer}    pIntGestCartera Identificador de la gestión de cartera
     *      @param {string}     pStrUserName    Usuario que realiza el proceso
     *      @param {integer}    pIntFileId      Identificador del fichero
     *      @param {string}     pStrMsgError    Mensaje de error
     */
    function __updFileStatus(pStrStatus, pIntLoteId, pIntGestCartera, pStrUserName, pIntFileId, pStrMsgError) {

        switch(pStrStatus){
            case 3:
                Ax.db.update("crp_rrhh_file",
                    {
                        file_status  : pStrStatus,
                        loteid       : pIntLoteId, 
                        pcs_seqno    : pIntGestCartera,
                        file_memo    : pStrMsgError,
                        user_updated : pStrUserName,
                        date_updated : new Ax.util.Date()      
                    },
                    {
                        file_seqno : pIntFileId
                    }
                );
               break;
               
            default:
                Ax.db.update("crp_rrhh_file",
                    {
                        file_status  : pStrStatus,
                        loteid       : pIntLoteId, 
                        pcs_seqno    : pIntGestCartera,
                        user_updated : pStrUserName,
                        date_updated : new Ax.util.Date()      
                    },
                    {
                        file_seqno : pIntFileId
                    }
                );
                break;
        }
    }

    /**
     * LOCAL FUNCTION: __insMovCostes
     *
     * Función local que registra en Movimientos de costes (ccoscont) la data 
     * del fichero de costos según la planilla a la que corresponda.
     *
     *      @param {integer}        pIntFileRefno   Identificador de fichero del tipo planilla.
     *      @param {ResultSet}      pRsSheet        ResultSet con la data del fichero.
     *      @param {string}         pStrUserName    Usuario que realiza el proceso.
     */
    function __insMovCostes(pIntFileRefno, pRsSheet, pStrUserName) { 

        // ===============================================================
        // Búsqueda del identificador de lote del fichero de planilla 
        // al que hace referencia.
        // ===============================================================
        var mIntPlanillaLoteId = Ax.db.executeGet(`
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
        if (mIntPlanillaLoteId == null) {
            throw new Ax.ext.Exception("La planilla con Id. [${fileId}] a la que hace referencia no posee un lote contable.",{fileId : pIntFileRefno});
        } 

        // ===============================================================
        // Recorrido de las filas del fichero de costos.
        // ===============================================================
        pRsSheet.forEach(_mPlRowSheet => {
            
            if(_mPlRowSheet.A !== null){

                // ===============================================================
                // Obtención del código equivalente de coste chavin
                // ===============================================================
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
                `, _mPlRowSheet.C);    // DCTACOS 

                // ===============================================================
                // Valida la existencia de un código equivalente de coste chavin
                // ===============================================================
                if (mStrCodAx === null) {
                    throw new Ax.ext.Exception("El centro de coste Chavin [${codAx}] no posee una sección contable de destino.",{codAx : _mPlRowSheet.C});
                }

                // ===============================================================
                // Búsqueda de un Movimiento contable (capuntes) según 
                // el lote contable (mIntPlanillaLoteId) y el número de cuenta 
                // de gasto (DCTAGAS).
                // ===============================================================
                var mObjApunte = Ax.db.executeQuery(`
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
                `, mIntPlanillaLoteId, _mPlRowSheet.B).toOne(); 

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
                        debe            : _mPlRowSheet.D,           // Debe
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
     * Función local que valida el CODIGO CRC y estado del fichero. 
     * 
     *      @param   {integer}   pIntFileId       Id. del fichero    
     *      @param   {string}    pStrCRC          Número CRC de control del fichero   
     */
    function __validateFile(pIntFileId, pStrCRC) { 

        var mIntExistFileLoad = 0;     
        var mIntFileId = pIntFileId;
        var mStrCRC    = pStrCRC;

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
                    AND crp_rrhh_file.file_status = 1
                </where>
            </select> 
        `, mStrCRC); 

        // ===============================================================
        // Validación de la existencia de más de un fichero 
        // en estado (1) y el mismo número CRC.
        // ===============================================================
        if (mIntExistFileLoad >= 1){
            throw new Ax.ext.Exception("El fichero con Id. [${fileId}] se encuentra duplicado y en estado 'En contabilidad'",{fileId : mIntFileId});
        }

        // ===============================================================
        // Obtener la data del fichero que se encuentre 
        // en estado '0' (Pendiente)
        // ===============================================================
        var mBlobFileRRHH = Ax.db.executeGet(` 
            <select>
                <columns>
                    crp_rrhh_file.file_data
                </columns>
                <from table='crp_rrhh_file'/>
                <where>
                        crp_rrhh_file.file_seqno  = ?
                    AND crp_rrhh_file.file_status = 0
                </where>
            </select>
        `, mIntFileId); 

        // ===============================================================
        // Validación del fichero que se encuentre en estado '0' (Pendiente).
        // ===============================================================
        if (!mBlobFileRRHH) {
            throw new Ax.ext.Exception("El fichero con Id. [${fileId}] se encuentra en un estado distinto de Pendiente.",{fileId : mIntFileId});
        } 
        
        return mBlobFileRRHH;
    }

    /**
     * LOCAL FUNCTION: __fileTransformation
     *
     * Función local que transforma el fichero de Biff5 a Biff8.
     * 
     *      @param   {integer}   pIntFileId       Id. del fichero    
     *      @param   {blob}      pBlobFile        File a leer    
     */
    function __fileTransformation(pIntFileId, pBlobFile) { 

        try{
            
            // ===============================================================
            // Creación de archivo .xls y se agrega la data (blob).
            // ===============================================================
            mFileBiff5 = new Ax.io.File("tmp/excel_biff5.xls");
            mFileBiff5.write(pBlobFile);
            
            var mStrPath = mFileBiff5.getAbsolutePath();
    
            // ===============================================================
            // Creación de archivo .xls transformado a una nueva 
            // versión actualizada.
            // ===============================================================
            var mStrPathNewFile    = new Ax.io.File("tmp").getAbsolutePath() + `/excel_convert_${pIntFileId}.xls`;
            var mPB                = new Ax.lang.ProcessBuilder();
            var mIntConverStatus   = mPB.directory('/home/axional').command('/bin/bash', '-c', `./xlsx-cli.sh ${mStrPath} ${mStrPathNewFile}`);
    
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
                var mWbWorkbook = Ax.ms.Excel.load(mFileBiff8.toBlob()); 
            }
            else {

                throw new Ax.ext.Exception("Error workbook: [${eWB}]",{eWB: mPB.getStdErr()});
            }
        } catch(e){
            
            throw new Ax.ext.Exception("El documento NO presenta el formato de excel. [${e}]",{e});
        }

        return mWbWorkbook;
    }

    /**
     * LOCAL FUNCTION: __insCarteraEfectos
     *
     * Función local que registra la cabecera para la Cartera de Efectos. 
     */
    function __insCarteraEfectos() { 
        
        var mIntSerial = Ax.db.insert("cefecges_pcs",
            { 
                pcs_empcode : '001',              // Código de empresa.
                pcs_proyec  : 'CRP0',             // Código de proyecto.
                pcs_seccio  : '0',                // Sección contable
                pcs_clase   : 'C',                // Clase de cartera
                pcs_accion  : 'CPLN',             // Código de acción asociada al proceso
                pcs_ctafin  : 'PR00CRPCH',        // Cuenta financiera
                pcs_moneda  : 'PEN',              // Moneda
                pcs_cambio  : '1',                // Cambio de divisa
                pcs_fecpro  : new Ax.util.Date(), // Fecha del proceso
                pcs_estado  : 'A',                // Estado del proceso
                pcs_tipgen  : 1                   // Tipo de gestion
            }
        ).getSerial(); 
        
        return mIntSerial;
    }

    /**
     * LOCAL FUNCTION: __insDetallesCarteraEfectos
     *
     * Función local que asigna detalles a la Cartera de Efectos
     *
     *      @param   {Integer}      pIntIdCarteraEfectos            Identificador de la Cartera de Efectos.
     *      @param   {Integer}      pIntLoteId                      Identificador de lote.
     *      @param   {ResultSet}    pRsSheetPln                     Resultset con la data de la planilla.
     */
    function __insDetallesCarteraEfectos(pIntIdCarteraEfectos, pIntLoteId, pRsSheetPln) { 
   
        // ===============================================================
        // Variables locales
        // =============================================================== 
        var _mObjEfectos        = null;     // Cartera de Efectos
        var _mStrFecFactura     = null;     // Fecha de factura
        var _mStrDocumento      = null;     // Documento o número de factura 
        var _mDoubleImporte     = null;     // Importe local 
        var _cefecges_pcsImpdiv = 0;        // Importe de divisas
        var _cefecges_pcsTotimp = 0;        // Importe total
        var _mIntNumOrden       = 1;        // Número de orden del Efecto 
        var mBcPcsImpdiv        = 0;        // Importe de divisas
        var mBcPcsTotimp        = 0;        // Importe total
        var mIntNumOrden        = 1;        // Número de orden del Efecto 
        var mObjCefecto         = {};
        
        var mRsCapuntes = Ax.db.executeQuery(`
            SELECT capuntes.docser,
                   capuntes.fecha,
                   capuntes.debe,
                   capuntes.haber
              FROM capuntes
             WHERE capuntes.loteid = ?
        `, pIntLoteId);
        
        for(var mRowCapuntes of mRsCapuntes){
            
            var mBcImport = Ax.math.bc.sub(mRowCapuntes.haber, mRowCapuntes.debe);
            
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
                            clase = 'C' 
                            AND tercer = '00000021' 
                            AND estado = 'PE' 
                            AND fecha &lt;= ?   
                            AND docser = ?
                            AND import = ?
                        </where>
                    </select>
                `, mRowCapuntes.fecha, mRowCapuntes.docser, mBcImport).toOne(); 
                
            if(mObjCefecto.cefectos_in_gestion == null) {
                continue;
            }
            
            if( mObjCefecto.cefectos_in_gestion == 0 ) {
                
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
                if (mObjCefecto.clase == 'P') {
                    mObjCefecto.impdiv     = - mObjCefecto.impdiv;
                    mObjCefecto.import     = - mObjCefecto.import;
                    mObjCefecto.pcs_totimp = - mObjCefecto.pcs_totimp;            
                }
                
                mObjCefecto.pcs_seqno  = pIntIdCarteraEfectos;
                mObjCefecto.det_numero = mObjCefecto.numero;
                mObjCefecto.det_impdiv = mObjCefecto.impdiv;
                mObjCefecto.det_import = mObjCefecto.import;
                mObjCefecto.ori_numero = mObjCefecto.numero;
                mObjCefecto.cabid      = mObjCefecto.cabid;
                mObjCefecto.apteid     = 0;
                mObjCefecto.rowenl     = pIntIdCarteraEfectos;
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
                `, pIntIdCarteraEfectos);  
            }

        }
        
        mRsCapuntes.close();
    }

    /**
     * LOCAL FUNCTION: __delFile
     *
     * Función local que elimina los archivos temporales usados como apoyo en 
     * el procesado de ficheros.
     *
     */
    function __delFile() {

        mFileBiff5.delete();
        mFileBiff8.delete();
    }
    
    /**
     * LOCAL FUNCTION: __getExisteCefecto
     *
     * Función local que busca de la cartera de efectos correspondiente 
     * a la fila del fichero de planilla.
     * 
     *      @param   {string}       pStrFecFactura           Fecha de documento.
     *      @param   {string}       pStrDocumento            Docser de documento.
     *      @param   {decimal}      pBcImporte               Importe de documento.     
     */
    function __getExisteCefecto(pStrFecFactura, pStrDocumento, pBcImporte) {
        
        var mBoolExist = false;
        

        var mIntCefectosInGestion = Ax.db.executeGet(`
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
        `, pStrFecFactura, pStrDocumento, pBcImporte);
        
        switch(mIntCefectosInGestion){
            
            case 0: 
                mBoolExist = true;
                break;
                
            default:
                mBoolExist = false;
                break;
        }
        
        return mBoolExist;
    }

    function __insCodEmpleado(pTmpPlanilla) {

        var mRsCodEmpleados = Ax.db.executeQuery(`
            <select>
                <columns>
                    empleado
                </columns>
                <from table='${pTmpPlanilla}' />
                <where>
                    empleado = '1411108'
                </where>
                <!-- <group>
                    1
                </group> -->
            </select>
        `);

        mRsCodEmpleados.forEach(mRowEmp => {
            if (mRowEmp.empleado !== null) {
                // ===============================================================
                // Búsqueda del código de empleado en Códigos auxiliares (cctaauxl)
                // ===============================================================
                var mIntExistCodEmp = Ax.db.executeGet(` 
                    <select>
                        <columns>
                            COUNT(*)
                        </columns>
                        <from table='cctaauxl'/>
                        <where>
                            cctaauxl.ctaaux = ?
                        </where>
                    </select>
                `, mRowEmp.empleado);

                // ===============================================================
                // Si no se encuentra registrado.
                // ===============================================================
                if (mIntExistCodEmp == 0) {

                    // ===============================================================
                    // Se registra el código de empleado en Códigos auxiliares (cctaauxl).
                    // ===============================================================
                    Ax.db.insert("cctaauxl", 
                        {
                            codaux: 'RRHH',
                            ctaaux: mRowEmp.empleado,
                            desval: mRowEmp.empleado,
                            estado: 'A'
                        }
                    );
                }
            }
        });
    }
    
    // ===============================================================
    //                  FIN DE FUNCIONES LOCALES
    // ===============================================================

    // ===============================================================
    //                  INICIO DE LA TRANSACCIÓN
    // =============================================================== 

    // ===============================================================
    // Definición de variables globales
    // =============================================================== 
    var mFileBiff5   = null;                     // Fichero de apoyo temporal con version Biff5
    var mFileBiff8   = null;                     // Fichero de apoyo temporal con version Biff8
    var mStrUserName = Ax.db.getUser();          // Nombre de usuario 
    
    // ===============================================================
    // 1. Se valida el estado y el número CRC del fichero.
    // 2. Transformación del fichero a Biff8
    // =============================================================== 
    var mBlobFileData = __validateFile(pIntFileId, pStrCRC); 
    var wb           = __fileTransformation(pIntFileId, mBlobFileData); 
    var mXlsSheet    = wb.getSheet(0);                      // Se obtiene la primera hoja de datos.
        mXlsSheet.removeRow(0);                             // Se elimina la primera fila, correspondiente a nombre de columnas.
    var mIntLastRow = mXlsSheet.getLastRowNum();            // Número de la última fila del fichero
        mRsSheet    = mXlsSheet.toResultSet();              // ResulSet con data del fichero 

    // ===============================================================
    // Se valida la existencia de registros a cargar.
    // ===============================================================
    if (mIntLastRow < 1){
        __delFile();
        
        throw `No existen registros a cargar en la hoja de Excel`;
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
                __insTmpCosto(pIntFileId, mRsSheet, pStrTipProc); 

                // ===============================================================
                // Registro de costos en Movimientos de costes (ccoscont)
                // ===============================================================
                var mIntLoteId = __insMovCostes(pIntFileRefno, mRsSheet, mStrUserName); 

                // ===============================================================
                // Actualiza el estado del fichero a 1 [Cargado] 
                // ===============================================================
                __updFileStatus(1, mIntLoteId, null, mStrUserName, pIntFileId);
                
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
                var mIntLoteId = __insPlanilla(mRsSheet); 
                
                switch (pStrTipProc) { 
                    case 'EMP':
                    case 'PRAC':
                        
                        var mIntContCapuntes = Ax.db.executeGet(`
                            SELECT COUNT(*) 
                              FROM capuntes 
                              WHERE loteid = ?
                        `, mIntLoteId);
                        
                        if (mIntContCapuntes > 0) {
            
                            // ===============================================================
                            // Se registra la Gestion de Cartera de Efectos (cefecges_pcs).
                            // ===============================================================
                            var mIntIdCarteraEfectos = __insCarteraEfectos();
                            

                            if(mIntIdCarteraEfectos) {
                                
                                // ===============================================================
                                // Se registra los detalles (lineas) de la Cartera
                                // de Efectos (cefecges_det).
                                // ===============================================================
                                __insDetallesCarteraEfectos(mIntIdCarteraEfectos, mIntLoteId, mRsSheet);
                                
                                var mIntLineasExist = Ax.db.executeGet(`
                                    SELECT COUNT(*) 
                                      FROM cefecges_det 
                                      WHERE pcs_seqno = ?
                                `, mIntIdCarteraEfectos);
                                // throw new Ax.ext.Exception("NUM-LINEAS: [${mIntLineasExist}]", {mIntLineasExist});
                                
                                if(mIntLineasExist == 0 ) {
                                    Ax.db.execute(`
                                        DELETE FROM cefecges_pcs WHERE pcs_seqno = ?
                                    `, mIntIdCarteraEfectos);
                                    
                                    __updFileStatus(1, mIntLoteId, null, mStrUserName, pIntFileId);
                                }
                                
                                if(mIntLineasExist > 0 ) {
                                    // ===============================================================
                                    // Se cierra la gestión de cartera
                                    // ===============================================================
                                    
                                    Ax.db.call("cefecges_estado_ava", mIntIdCarteraEfectos, 0);
                    
                                    // ===============================================================
                                    // Actualiza el estado del fichero del fichero a 1 [Cargado] 
                                    // ===============================================================
                                    __updFileStatus(1, mIntLoteId, mIntIdCarteraEfectos, mStrUserName, pIntFileId);
                                }
                            } else {
                                __updFileStatus(1, mIntLoteId, null, mStrUserName, pIntFileId);
                            }
                            
                        } else {
                            throw new Ax.ext.Exception('Revisar que las columnas TIP_DOC, SERIE y COMPROBANTE esten informadas en el fichero a cargar ');
                        }
                        
                        break;
                    case 'PROV':
                        __updFileStatus(1, mIntLoteId, null, mStrUserName, pIntFileId);
                        break;
                        
                    default:
                        __delFile();
                        throw new Ax.ext.Exception('El tipo de proceso es no soportado.');
                        break;
                }
                break;

            default:
                __delFile();
                throw new Ax.ext.Exception('El proceso de registro es no soportado.');
                break;
        }

        // ===============================================================
        // Eliminado de ficheros de apoyo temporales.
        // ===============================================================
        __delFile();

        Ax.db.commitWork();
        
    } catch(error) {

        Ax.db.rollbackWork();
        
        var mStrMessageError = `${error.message || error}`;

        // ===============================================================
        // Update del estado del fichero a Error (3)
        // ===============================================================
        __updFileStatus(3, null, null, mStrUserName, pIntFileId, mStrMessageError);

        // ===============================================================
        // Se elimina los archivos temporales usados como apoyo 
        // en el procesado de lectura de ficheros.
        // ===============================================================
        __delFile();
        
        throw `[ERROR]: ${mStrMessageError}`;
    }
}








cefecges_pcs.moneda == null && cefecges_pcs.pcs_totimp && cefecges_pcs.ctafin == 1