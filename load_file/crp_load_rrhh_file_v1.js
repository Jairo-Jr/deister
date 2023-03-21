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
 *  Version     : v1.11
 *  Date        : 2023-03-21
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
    // FUNCIONES LOCALES
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
        var _mObjMaximos    = null;
        var _mIntAsient     = 0;
        var _mIntLoteId     = 0;
        var _mIntNumOrden   = 1; 
        var _mStrDocSer     = '';

        // ===============================================================
        // Obtención de los números máximos de asientos 
        // e identificador de lote.
        // ===============================================================
        _mObjMaximos = Ax.db.executeQuery(`
            <select>
                <columns>
                    MAX(asient) max_asient,
                    MAX(loteid) max_lote_id
                </columns>
                <from table='capuntes'/>
            </select>
        `).toOne();

        // ===============================================================
        // Generación del numero de asiento e identificador de lote.
        // ===============================================================
        _mIntAsient = _mObjMaximos.max_asient + 1;
        _mIntLoteId = _mObjMaximos.max_lote_id + 1; 

        // ===============================================================
        // Recorrido de la data del fichero de planilla.
        // ===============================================================
        pRsSheet.forEach(_mRowSheetPln => {

            // ===============================================================
            // Validación de la existencia de data para su registro.
            // ===============================================================
            if(_mRowSheetPln.A !== null){

                // ===============================================================
                // Componer el número de documento con la SERIE (column I) y el COMPROBANTE (column J).
                // ===============================================================
                _mStrDocSer = (_mRowSheetPln.I === null || _mRowSheetPln.J === null) ? '-' : _mRowSheetPln.I + '-' + _mRowSheetPln.J; 
                
                // ===============================================================
                // registro del Movimiento contable (capuntes)
                // ===============================================================
                Ax.db.insert("capuntes", {
                    empcode         :   '001',                          // Código de Empresa
                    proyec          :   'CRP0',                         // Línea de negocio
                    sistem          :   'A',                            // Sistema
                    seccio          :   '0',                            // Sección
                    fecha           :   _mRowSheetPln.C,                // Fecha
                    asient          :   _mIntAsient,                    // Número de asiento
                    diario          :   '40',                           // Código de diario
                    orden           :   _mIntNumOrden++,                // Número de Orden
                    jusser          :   'GL',                           // Justificante
                    origen          :   'F',                            // Origen de apunte
                    docser          :   _mStrDocSer,                    // Documento o número de factura
                    punteo          :   'N',                            // Apunte auditado
                    placon          :   'CH',                           // Plan contable
                    cuenta          :   _mRowSheetPln.E,                // Cuenta contable
                    codaux          :   'RRHH',                         // Grupo auxiliar
                    ctaaux          :   _mRowSheetPln.F,                // Código auxiliar
                    contra          :   null,                           // Contrapartida
                    codcon          :   mObjCodCon[_mRowSheetPln.H],    // Conceptos contables
                    concep          :   _mRowSheetPln.G,                // Descripción del apunte
                    fecval          :   _mRowSheetPln.K,                // Fecha de valor
                    moneda          :   'PEN',                          // Moneda de transacción
                    divdeb          :   _mRowSheetPln.M,                // Debe divisa
                    divhab          :   _mRowSheetPln.N,                // Haber divisa
                    cambio          :   '1.000000',                     // Cambio
                    divemp          :   'PEN',                          // Moneda de la empresa
                    debe            :   _mRowSheetPln.M,                // Debe
                    haber           :   _mRowSheetPln.N,                // Haber
                    loteid          :   _mIntLoteId,                    // Identificador de lote
                    user_created    :   pStrUserName,
                    user_updated    :   pStrUserName
                });
            } 
        });

        return _mIntLoteId;
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

        if (mIntExistGroupAux == 0) {
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

        // ===============================================================
        // Variables locales.
        // =============================================================== 
        var _mRsCtaAux = null;
        var _mIntExistCtaAux = null;

        // ===============================================================
        // Se agrupan los códigos de empleados recién ingresados, 
        // según el código de lote.
        // ===============================================================
        _mRsCtaAux = Ax.db.executeQuery(` 
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
        _mRsCtaAux.forEach(_mIntCtaAux => {

            // ===============================================================
            // Si el código no es null
            // ===============================================================
            if (_mIntCtaAux.ctaaux !== null) {

                // ===============================================================
                // Búsqueda del código de empleado en Códigos auxiliares (cctaauxl)
                // ===============================================================
                _mIntExistCtaAux = Ax.db.executeGet(` 
                    <select>
                        <columns>
                            COUNT(*)
                        </columns>
                        <from table='cctaauxl'/>
                        <where>
                            cctaauxl.ctaaux = ?;
                        </where>
                    </select>
                `, _mIntCtaAux.ctaaux);

                // ===============================================================
                // Si no se encuentra registrado.
                // ===============================================================
                if (_mIntExistCtaAux == 0) {

                    // ===============================================================
                    // Se registra el código de empleado en Códigos auxiliares (cctaauxl).
                    // ===============================================================
                    Ax.db.insert("cctaauxl", {
                        codaux: 'RRHH',
                        ctaaux: _mIntCtaAux.ctaaux,
                        desval: _mIntCtaAux.ctaaux,
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
                user_updated : pStrUserName,
                date_updated : mTodayDate
            },
            {
                file_seqno : pIntFileId
            }
        );

        // ===============================================================
        // Actualizado del identificador de la gestión de cartera.
        // 
        // - Uso temporal por error al no detectar la columna 
        // 'pcs_seqno', al usar el método update de axional -
        // ===============================================================
        if (pIntGestCartera != null) {
            Ax.db.execute(`
                UPDATE crp_rrhh_file
                SET pcs_seqno = ${pIntGestCartera}
                WHERE file_seqno = ?
            `, pIntFileId);  
        }
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
        var _mIntPlanillaLoteId = null;
        var _mStrCodAx = null;
        var _mObjApunte = null;

        // ===============================================================
        // Búsqueda del identificador de lote del fichero de planilla 
        // al que hace referencia.
        // ===============================================================
        _mIntPlanillaLoteId = Ax.db.executeGet(`
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
        if (_mIntPlanillaLoteId === null) {
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
                _mStrCodAx = Ax.db.executeGet(`
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
                if (_mStrCodAx === null) {
                    throw new Ax.ext.Exception("El centro de coste Chavin [${codAx}] no posee una sección contable de destino.",{codAx : mRowSheet.C});
                }

                // ===============================================================
                // Búsqueda de un Movimiento contable (capuntes) según 
                // el lote contable (_mIntPlanillaLoteId) y el número de cuenta 
                // de gasto (DCTAGAS).
                // ===============================================================
                _mObjApunte = Ax.db.executeQuery(`
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
                `, _mIntPlanillaLoteId, _mPlRowSheet.B).toOne();

                

                /**
                 * Insert en Apuntes de Costes (ccoscont)
                 */
                Ax.db.insert('ccoscont', {
                    empcode         : _mObjApunte.empcode,      // Código de Empresa
                    proyec          : _mObjApunte.proyec,       // Línea de negocio
                    seccio          : _mStrCodAx,               // Sección
                    fecha           : _mObjApunte.fecha,        // Fecha
                    apteid          : _mObjApunte.apteid,       // Identificador de apunte
                    diario          : _mObjApunte.diario,       // Código de diario
                    jusser          : _mObjApunte.jusser,       // Justificante
                    docser          : _mObjApunte.docser,       // Documento o número de factura
                    sistem          : _mObjApunte.sistem,       // Sistema
                    placon          : _mObjApunte.placon,       // Plan contable
                    centro          : '0',                      /* DATO POR DEFINIR - TEMPORAL */
                    ctaexp          : '0',                      /* DATO POR DEFINIR - TEMPORAL */
                    cuenta          : _mObjApunte.cuenta,       // Cuenta contable
                    dimcode1        : _mObjApunte.dimcode1,     // Dimensión 1
                    cantid1         : _mObjApunte.cantid1,      // Cantidad 1
                    dimcode2        : _mObjApunte.dimcode2,     // Dimensión 2
                    cantid2         : _mObjApunte.cantid2,      // Cantidad 2
                    codcon          : _mObjApunte.codcon,       // Concepto
                    concep          : _mObjApunte.concep,       // Descripción
                    porcen          : '100',                    /* DATO POR DEFINIR - TEMPORAL */
                    debe            : _mPlRowSheet.D,           // Debe
                    haber           : '0',                      // Haber
                    user_created    : pStrUserName,
                    user_updated    : pStrUserName
                });
            }
        });

        return _mIntPlanillaLoteId;
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
        var _mIntExistFileLoad = 0;                      // Número de archivos cargados con igual CRC. 

        // ===============================================================
        // Obtener la cantidad de archivos con el mismo número CRC 
        // de control y en estado '1' (En contabilidad)
        // ===============================================================
        _mIntExistFileLoad = Ax.db.executeGet(`
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
        if (_mIntExistFileLoad >= 1){
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
        var _mStrPath           = null;     // Ruta del fichero Biff5
        let _mStrPathNewFile    = null;     // Ruta del fichero Biff8
        var _mPB                = null;     // Procesador Biff5
        var _mIntConverStatus   = null;     // Estado de conversión
        var _mObjWorkbook       = null;     // Fichero de planilla

        try{
            
            // ===============================================================
            // Creación de archivo .xls y se agrega la data (blob).
            // ===============================================================
            mFileBiff5 = new Ax.io.File("tmp/excel_biff5.xls");
            mFileBiff5.write(mObjRRHHFile);
            _mStrPath = mFileBiff5.getAbsolutePath();
    
            // ===============================================================
            // Creación de archivo .xls transformado a una nueva 
            // versión actualizada.
            // ===============================================================
            _mStrPathNewFile    = new Ax.io.File("tmp").getAbsolutePath() + `/excel_convert_${pIntFileId}.xls`;
            _mPB                = new Ax.lang.ProcessBuilder();
            _mIntConverStatus   = _mPB.directory('/home/axional').command('/bin/bash', '-c', `./xlsx-cli.sh ${_mStrPath} ${_mStrPathNewFile}`);
    
            // ===============================================================
            // Validación de la correcta transformación del archivo.
            // ===============================================================
            if (_mIntConverStatus == 0) {

                // ===============================================================
                // Se obtiene el nuevo archivo transformado a la nueva versión.
                // ===============================================================
                mFileBiff8 = new Ax.io.File(_mStrPathNewFile);
    
                // ===============================================================
                // Carga del nuevo archivo.
                // ===============================================================
                _mObjWorkbook = Ax.ms.Excel.load(mFileBiff8.toBlob()); 
            }
            else {

                throw new Ax.ext.Exception("Error workbook: [${eWB}]",{eWB: _mPB.getStdErr()});
            }
        } catch(e){
            throw new Ax.ext.Exception("El documento NO presenta el formato de excel. [${e}]",{e});
        }

        return _mObjWorkbook;
     
    }

    /**
     * LOCAL FUNCTION: __insCarteraEfectos
     *
     * Description: Función local que registra la cabecera para la Cartera de Efectos. 
     *
     */
    function __insCarteraEfectos() { 
        
        var _mIntSerial = 0;

        // ===============================================================
        // Se genera la cabecera para la Cartera de Efectos solo para 
        // los procesos de Empleados (EMP) y Practicantes (PRAC). 
        // Para el caso de Provisión (PROV) se lanza una excepción.
        // ===============================================================
        if (pStrTipProc == 'PROV') { 
            throw new Ax.ext.Exception('No es posible generar Cartera de Efectos para el proceso de Provisión');
            
        } 

        _mIntSerial = Ax.db.insert("cefecges_pcs",
            { 
                pcs_empcode : '001',         // Código de empresa.
                pcs_proyec  : 'CRP0',        // Código de proyecto.
                pcs_seccio  : '0',           // Sección contable
                pcs_clase   : 'C',           // Clase de cartera
                pcs_accion  : 'CPLN',        // Código de acción asociada al proceso
                pcs_ctafin  : 'PR00CRPCH',   // Cuenta financiera
                pcs_moneda  : 'PEN',         // Moneda
                pcs_cambio  : '1',           // Cambio de divisa
                pcs_fecpro  : mTodayDate,    // Fecha del proceso
                pcs_estado  : 'A',           // Estado del proceso
                pcs_tipgen  : '0'            // Tipo de gestion
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

        // ===============================================================
        // Recorrido de las filas del fichero de planilla.
        // ===============================================================
        pRsSheetPln.forEach(_mRowFilePln => { 

            // ===============================================================
            // Se procesa la planilla solo si las columnas del fichero 
            // correspondientes a TIPO_DOC, SERIE y COMPROBANTE, 
            // respectivamente, son diferentes de null.
            // ===============================================================
            if(_mRowFilePln.H != null && _mRowFilePln.I != null && _mRowFilePln.J) {

                console.log('SI');

                _mStrFecFactura = _mRowFilePln.C;
                _mStrDocumento  = _mRowFilePln.I + '-' + _mRowFilePln.J;
                _mDoubleImporte = _mRowFilePln.N - _mRowFilePln.M;

                // ===============================================================
                // Busqueda de la cartera de efectos correspondiente 
                // a la fila del fichero de planilla.
                // ===============================================================
                _mObjEfectos = Ax.db.executeQuery(`
                    <select>
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
                `, _mStrFecFactura, _mStrDocumento, _mDoubleImporte).toOne();
                console.log(_mObjEfectos);
                // ===============================================================
                // Validar que el efecto no se encuentre registrado como gestion de otra Cartera.
                // ===============================================================
                if (_mObjEfectos.cefectos_in_gestion == 0) {

                    /** 
                    * El valor de cefectos_impdiv viene devuelto según la transformación
                    * realizada desde el objeto cefectos_sel , la cual permite procesar
                    * grupos de efectos de ambos tipos de carteras, esto es :
                    * 
                    *       case clase = 'C' then +impdiv else -impdiv end
                    * 
                    * En este punto los importes deben adquirir de nuevo su signo según se
                    * expresa en el registro de la tabla cefectos, que a dia de hoy, es decir
                    * la versión actual , en ambas carteras se registran en signo positivo las
                    * facturas y en signo negativo los abonos. 
                    */
                    if (_mObjEfectos.clase == 'P') {
                        _mObjEfectos.impdiv     = - _mObjEfectos.impdiv;
                        _mObjEfectos.import     = - _mObjEfectos.import;
                        _mObjEfectos.pcs_totimp = - _mObjEfectos.pcs_totimp;            
                    }

                    _mObjEfectos.pcs_seqno  = pIntIdCarteraEfectos;
                    _mObjEfectos.det_numero = _mObjEfectos.numero;
                    _mObjEfectos.det_impdiv = _mObjEfectos.impdiv;
                    _mObjEfectos.det_import = _mObjEfectos.import;
                    _mObjEfectos.ori_numero = _mObjEfectos.numero;
                    _mObjEfectos.cabid      = _mObjEfectos.cabid;
                    _mObjEfectos.apteid     = 0;
                    _mObjEfectos.rowenl     = pIntIdCarteraEfectos;
                    _mObjEfectos.estcon     = 'N';
                    _mObjEfectos.det_agrupa = _mIntNumOrden++;

                    Ax.db.insert("cefecges_det", _mObjEfectos); 

                    _cefecges_pcsImpdiv = Ax.math.bc.add(_cefecges_pcsImpdiv, _mObjEfectos.det_impdiv);
                    _cefecges_pcsTotimp = Ax.math.bc.add(_cefecges_pcsTotimp, _mObjEfectos.pcs_totimp); 

                    Ax.db.execute(`
                        UPDATE cefecges_pcs
                        SET pcs_impdiv = ${_cefecges_pcsImpdiv},
                            pcs_totimp = ${_cefecges_pcsTotimp}
                        WHERE pcs_seqno = ?
                    `, pIntIdCarteraEfectos);  
                    
                } 
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
        // ===============================================================
        // Eliminación de ficheros de apoyo temporales.
        // ===============================================================
        mFileBiff5.delete();
        mFileBiff8.delete();
    }

    // ===============================================================
    // Definición de variables globales
    // =============================================================== 
    var mFileBiff5 = null;
    var mFileBiff8 = null; 
    var mIntLoteId = null;                          // Identificador de lote
    var mStrUserName = Ax.db.getUser();             // Nombre de usuario 
    var mObjRRHHFile = null;
    var mTodayDate = new Ax.util.Date();
    var wb = null;                                        // Excel workbook
    var mXlsSheet = null;                              // Excel sheet
    var mIntLastRow = null;                            // Número de la ultima fila del fichero.
    var mObjCodCon = {F: 'FV', B: 'BV'};                // Códigos de conceptos contables
    var mIntIdCarteraEfectos = null;                // Identificador de la Cartera de Efectos.

    // ===============================================================
    // INICIO DE LA TRANSACCION
    // =============================================================== 

    // ===============================================================
    // Se valida el estado y el número CRC del fichero.
    // ===============================================================
    __validateFile(); 

    // ===============================================================
    // Transformación del fichero a Biff8
    // =============================================================== 
    wb = __fileTransformation(); 
    
    mXlsSheet = wb.getSheet(0);     // Se obtiene la primera hoja de datos.
    mXlsSheet.removeRow(0);   // Se elimina la primera fila, correspondiente a nombre de columnas.
    
    mIntLastRow = mXlsSheet.getLastRowNum();    // Número de la última fila del fichero
    mRsSheet = mXlsSheet.toResultSet();         // ResulSet con data del fichero 

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
                mIntLoteId = __insMovCostes(pIntFileRefno, mRsSheet, mStrUserName); 

                // ===============================================================
                // Actualizado del estado del fichero a En contabilidad (1)
                // ===============================================================
                __updFileStatus('1', mIntLoteId, null, mStrUserName, pIntFileId);
                
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
                mIntLoteId = __insPlanilla(mRsSheet, mStrUserName); 

                // ===============================================================
                // Registro de los códigos de empleados.
                // ===============================================================
                __insCodEmp(mIntLoteId);

                // ===============================================================
                // Se registra la Gestion de Cartera de Efectos (cefecges_pcs).
                // ===============================================================
                mIntIdCarteraEfectos = __insCarteraEfectos();

                // ===============================================================
                // Se registra los detalles (lineas) de la Cartera
                // de Efectos (cefecges_det).
                // ===============================================================
                __insDetallesCarteraEfectos(mIntIdCarteraEfectos, mRsSheet);


                // ===============================================================
                // Se cierra la gestión de cartera
                // ===============================================================
                Ax.db.call("cefecges_estado_ava", mIntIdCarteraEfectos, 0);

                // ===============================================================
                // Update del estado del fichero a En contabilidad (1)
                // ===============================================================
                __updFileStatus('1', mIntLoteId, mIntIdCarteraEfectos, mStrUserName, pIntFileId);

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
        console.error(error); // Log error

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