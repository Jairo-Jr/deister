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
 *  JS:  crp_transfer_bcp
 *  Version     : v1.11
 *  Date        : 05-10-2023
 *  Description : Genera un archivo txt de transferencias prov. para BCP
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: crp_transfer_bcp_pen              A través de la acción 'ACTION_SOPORTE_ELEC' de cremesas
 *
 *  PARAMETERS:
 *  ==================
 *
 *                @param    {integer}    pIntNumRemesa        Numero de la remesa
 *
 **/
function crp_transfer_bcp(pIntNumRemesa, pStrDivisa) {

    /**
     * LOCAL FUNCTION: __getNumCuentaCtrl
     *
     * Description: Funcion para dar formato al numero de cuenta necesario para checksum
     *
     * PARAMETERS:
     *      @param  {string}       pStrNumCuenta           Numero de cuenta bancaria
     */
    function __getNumCuentaCtrl(pStrNumCuenta) {
        var mStrCuenta = pStrNumCuenta.trim().substring(3);

        return parseInt(mStrCuenta);
    }

    /**
     * VARIABLES DE ENTRADA
     */
    var mIntNumrem = pIntNumRemesa;
    var mStrDivisa = pStrDivisa;
    var mStrMessageError = '';
    var mIntNumCtrlchecksum = 0;

    //==========================================================================
    // Datos necesarios del detalle de la trama de BCP
    // tipo_cuenta (segun cterbanc.tipcta)
    //      1 -> C Cuenta corriente
    //      2 -> A Cuenta ahorro
    //      3 -> M Maestra
    //      4 -> M Maestra
    // moneda_abono (del documento a liquidar):
    //      PEN -> 0001 Soles
    //      USD -> 1000 Dolares
    // flag_idc
    //      N = No desea validar IDC vs Cuenta
    //      S = Si desea validar IDC vs Cuenta
    // moneda_abono (de la cuenta bancaria de la empresa):
    //      PEN -> 0001 Soles
    //      USD -> 1000 Dolares
    // tipo_cuenta (corriente o maestra segun cbancpro.agrcta):
    //      CC -> C Cuenta corriente
    //      ?? -> M Maestra
    // flag_itf (exoneracion ITF):
    //      N = Cuando la cuenta de abono NO pertenece al mismo titular de la cuenta origen Pagos
    //      S = Cuando la cuenta de abono SI pertenece al mismo titular de la cuenta origen Traspasos
    //
    //==========================================================================
    var mStrDetails = '';
    var mArrayDetalles = Ax.db.executeQuery(`
        <select>
            <columns>
                cefecges_det.det_agrupa                                             <alias name = 'det_agrupa' />,
                '2'                                                                 <alias name = 'tipo_registro' />,
                ''                                                                  <alias name = 'tipo_cuenta' />,
                ''                                                                  <alias name = 'nmr_cuenta_abono'/>,
                '1'                                                                 <alias name = 'modo_pago'/>,
                MAX(CASE WHEN ctercero.ciftyp = 1 THEN '1'
                        WHEN ctercero.ciftyp = 4 THEN '3'
                        WHEN ctercero.ciftyp = 6 THEN '6'
                        WHEN ctercero.ciftyp = 7 THEN '4'
                        ELSE '--'
                END)                                                                <alias name = 'tipo_documento'/>,
                MAX(RPAD(TRIM(ctercero.cif), 12,' '))                               <alias name = 'num_documento' />,
                '   '                                                               <alias name = 'correlativo_doc' />,
                MAX(RPAD(TRIM(ctercero.nombre), 75,' '))                            <alias name = 'nombre_proveedor' />,
                MAX(RPAD(TRIM(cefectos.docser), 40,' '))                            <alias name = 'referencia_proveedor' />,
                MAX(RPAD(TRIM(NVL(cefectos.refban, cefectos.docser)), 20, ' '))     <alias name = 'referencia_empresa' />,
                MAX(CASE WHEN cefectos.moneda = 'PEN' THEN '0001'
                        WHEN cefectos.moneda = 'USD' THEN '1001'
                        ELSE '--'
                END)                                                                <alias name = 'moneda_abono' />,
                ABS(SUM(cefecges_det.det_impdiv))                                        <alias name = 'importe_abono' />,
                'S'                                                                 <alias name = 'flag_idc' />,
                MAX(ctercero.codigo)                                                <alias name = 'tercero' />
            </columns>
            <from table = 'cefecges_pcs'>
                <join table = 'cefecges_det'>
                    <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                    <join table = 'cefectos'>
                        <on>cefecges_det.det_numero = cefectos.numero</on>
                        <join table = 'ctercero'>
                            <on>cefectos.codper = ctercero.codigo</on>
                        </join>
                    </join>
                </join>
            </from>
            <where>
                cefecges_pcs.pcs_numrem = ?
            </where>
            <group>
                1
            </group>
            <order>
                6
            </order>
        </select>
    `, mIntNumrem).toJSONArray();

    var mObjCodMoneda = {
        'PEN': '0001',
        'USD': '1001'
    };

    mArrayDetalles.forEach(mObjDetalle => {

        var mObjDataTerbanc = Ax.db.executeQuery(`
            <select first='1'>
                <columns>
                    CASE WHEN cterbanc.tipcta = 1 THEN 'C'
                         WHEN cterbanc.tipcta = 2 THEN 'A'
                         WHEN cterbanc.tipcta = 3 THEN 'M'
                         WHEN cterbanc.tipcta = 4 THEN 'M'
                         ELSE '--'
                    END                                     <alias name = 'tipo_cuenta' />,
                    RPAD(TRIM(cterbanc.iban), 20,' ')       <alias name = 'nmr_cuenta_abono'/>
                </columns>
                <from table = 'ctercero'>
                    <join type = 'left' table = 'cterbanc'>
                        <on>ctercero.codigo = cterbanc.codigo</on>
                    </join>
                </from>
                <where>
                    cterbanc.tipcta IN (1,2,3,4)
                    -- AND CHAR_LENGTH(cterbanc.iban) >=13
                    AND ctercero.codigo = ?
                </where>
                <order>
                    cterbanc.priori DESC
                </order>
            </select>
        `, mObjDetalle.tercero).toOne();

        /**
         * Asocia datos bancarios del tercero
         */
        mObjDetalle.tipo_cuenta = mObjDataTerbanc.tipo_cuenta;
        mObjDetalle.nmr_cuenta_abono = mObjDataTerbanc.nmr_cuenta_abono;

        /**
         * Validacion de datos necesarios
         */
        if (!mObjDetalle.tipo_cuenta || mObjDetalle.tipo_cuenta == '--'){
            mStrMessageError += `Tipo de cuenta de proveedor [${mObjDetalle.tercero}] incorrecto para pagos.\n`;
        }
        if (!mObjDetalle.tipo_documento || mObjDetalle.tipo_documento == '--'){
            mStrMessageError += `Tipo de Id. fiscal del proveedor ${mObjDetalle.tercero} no contemplado.\n`;
        }
        if (!mObjDetalle.moneda_abono || mObjDetalle.moneda_abono != mObjCodMoneda[mStrDivisa]){
            mStrMessageError += `La moneda del efecto [${mObjDetalle.referencia_proveedor}] es diferente de [${mStrDivisa}].\n`;
        }

        // mStrDetails += __getEstructuraDetalle(mObjDataTerbanc, mObjDetalle.impdiv);

    });

    /**
     * Finaliza si algún dato necesario no está informado
     */
    if(mStrMessageError != '') {
        throw new Error(mStrMessageError);
    }

    var NumberFormatUs = new Ax.text.NumberFormat("us");

    mArrayDetalles.forEach(mObjDetalle => {

        var mIntPos                  = mObjDetalle.referencia_proveedor.indexOf("-");
        var mStrSerie                = mObjDetalle.referencia_proveedor.substring(0, mIntPos);
        var mStrCorrelativo          = mObjDetalle.referencia_proveedor.substring(mIntPos+1, mObjDetalle.referencia_proveedor.length);
        var mStrCorrelativoFormato   = NumberFormatUs.format(mStrCorrelativo, "00000000");
        mObjDetalle.referencia_proveedor = mStrSerie + mStrCorrelativoFormato;

        mIntPos                  = mObjDetalle.referencia_empresa.indexOf("-");
        mStrSerie                = mObjDetalle.referencia_empresa.substring(0, mIntPos);
        mStrCorrelativo          = mObjDetalle.referencia_empresa.substring(mIntPos+1, mObjDetalle.referencia_empresa.length);
        mStrCorrelativoFormato   = NumberFormatUs.format(mStrCorrelativo, "00000000");
        mObjDetalle.referencia_empresa = mStrSerie + mStrCorrelativoFormato;


        var mStrImporteAbonarFormato = NumberFormatUs.format(mObjDetalle.importe_abono, "00000000000000.00");
        mObjDetalle.importe_abono = mStrImporteAbonarFormato;

        var mStrRowDetalle = new Ax.text.Line(196)
            .add(0,   mObjDetalle.tipo_registro)
            .add(1,   mObjDetalle.tipo_cuenta)
            .add(2,   mObjDetalle.nmr_cuenta_abono)
            .add(22,  mObjDetalle.modo_pago)
            .add(23,  mObjDetalle.tipo_documento)
            .add(24,  mObjDetalle.num_documento)
            .add(36,  mObjDetalle.correlativo_doc)
            .add(39,  mObjDetalle.nombre_proveedor)
            .add(114, mObjDetalle.referencia_proveedor)
            .add(154, mObjDetalle.referencia_empresa)
            .add(174, mObjDetalle.moneda_abono)
            .add(178, mObjDetalle.importe_abono)
            .add(195, mObjDetalle.flag_idc)
            .toString();
        mStrDetails += '\n' + mStrRowDetalle;

        mIntNumCtrlchecksum += __getNumCuentaCtrl(mObjDetalle.nmr_cuenta_abono);
    });


    /**
     *
     * CONSTRUCCION DEL ENCABEZADO
     *
     */
    var mIntNumRegistros = mArrayDetalles.length;
    const mObjHeader = Ax.db.executeQuery(`
        <select>
            <columns>
                '1'                                             <alias name = 'tipo_registro' />,
                LPAD('${mIntNumRegistros}', 6,'0')              <alias name = 'cantidad_planilla'/>,
                TO_CHAR(cremesas.fecrem, '%Y%m%d')              <alias name = 'fecha_proceso'/>,
                CASE WHEN cbancpro.agrcta = 'CC' THEN 'C'
                     ELSE 'M'
                END                                             <alias name = 'tipo_cuenta'/>,
                CASE WHEN cbancpro.moneda = 'PEN' THEN '0001'
                     WHEN cbancpro.moneda = 'USD' THEN '1001'
                     ELSE '--'
                END                                             <alias name = 'moneda_cargo' />,
                RPAD(TRIM(cbancpro.bban), 20,' ')               <alias name = 'nmr_cuenta_cargo'/>,
                ABS(cremesas.imptot)                            <alias name = 'monto_planilla'/>,
                RPAD(TRIM(cremesas.jusser), 40, ' ')            <alias name = 'referencia_planilla'/>,
                'N'                                             <alias name = 'flag_itf' />,
                ''                                              <alias name = 'checksum' />,
                cremesas.ctafin                                 <alias name = 'cta_financiera' />,
                cremesas.jusser                                 <alias name = 'rem_docser' />
            </columns>
            <from table='cremesas'>
                <join table='cbancpro'>
                    <on>cremesas.ctafin = cbancpro.ctafin</on>
                </join>
            </from>
            <where>
                cremesas.numrem  = ?
            </where>
        </select>
    `, mIntNumrem).toOne();

    mIntNumCtrlchecksum += __getNumCuentaCtrl(mObjHeader.nmr_cuenta_cargo);

    /**
     * Validacion de datos necesarios
     */
    if (!mObjHeader.moneda_cargo || mObjHeader.moneda_cargo != mObjCodMoneda[mStrDivisa]){
        mStrMessageError += `La moneda de la cuenta financiera [${mObjHeader.cta_financiera}] para la remesa [${mObjHeader.rem_docser}] es diferente de [${mStrDivisa}].\n`;
    }
    if (!mObjHeader.nmr_cuenta_cargo || mObjHeader.nmr_cuenta_cargo.trim() == ''){
        mStrMessageError += `Cta. Bancaria no valida/inexistente para la cuenta financiera [${mObjHeader.cta_financiera}] de la remesa [${mObjHeader.rem_docser}].\n`;
    }

    /**
     * Finaliza si algún dato necesario no está informado
     */
    if(mStrMessageError != '') {
        throw new Error(mStrMessageError);
    }

    var mStrImporteTotalFormato   = NumberFormatUs.format(mObjHeader.monto_planilla, "00000000000000.00");
    mObjHeader.monto_planilla = mStrImporteTotalFormato;

    mObjHeader.checksum = NumberFormatUs.format(mIntNumCtrlchecksum, "000000000000000");

    var mStrHeader = new Ax.text.Line(113)
        .add(0,   mObjHeader.tipo_registro)
        .add(1,   mObjHeader.cantidad_planilla)
        .add(7,  mObjHeader.fecha_proceso)
        .add(15,  mObjHeader.tipo_cuenta)
        .add(16,  mObjHeader.moneda_cargo)
        .add(20,  mObjHeader.nmr_cuenta_cargo)
        .add(40,  mObjHeader.monto_planilla)
        .add(57,  mObjHeader.referencia_planilla)
        .add(97,  mObjHeader.flag_itf)
        .add(98,  mObjHeader.checksum)
        .toString();

    var mStrBodyTxt = mStrHeader + mStrDetails;

    /**
     * Creacion del archivo txt
     */
    var mFileTxtTramaBCP = new Ax.sql.Blob(`transferBCP${pStrDivisa}.txt`);
    mFileTxtTramaBCP.setContentType("text/plain");
    mFileTxtTramaBCP.setContent(mStrBodyTxt);

    /**
     * Variables con informacion para la respuesta
     */
    var mFileProc     = `crp_transfer_bcp_${pStrDivisa.toLowerCase()}`;
    var mFileName     = `transferBCP${pStrDivisa}.txt`;
    var mFileMemo     = `Transferencia BCP ${pStrDivisa}`;
    var mStrFileArgs  = `Numero de remesa: ${mIntNumrem}`;
    var mHashMD5      = new Ax.crypt.Digest("MD5");
    var mStrHashTrama = mHashMD5.update(mFileTxtTramaBCP).digest();

    Ax.db.execute(`DELETE FROM csopmagn WHERE file_md5 = ?`, mStrHashTrama);

    var mObjInsertCsopmagn = {
        file_proc    : mFileProc,
        file_name    : mFileName,
        file_memo    : mFileMemo,
        file_args    : mStrFileArgs,
        file_type    : 'text/plain',
        file_size    : mFileTxtTramaBCP.length(),
        file_md5     : mStrHashTrama,
        file_data    : mFileTxtTramaBCP,
        user_created : Ax.db.getUser(),
        date_created : new Ax.util.Date(),
    };

    var mIntSeqno = Ax.db.insert('csopmagn', mObjInsertCsopmagn).getSerial();

    return Ax.db.executeQuery(`SELECT * FROM csopmagn WHERE file_seqno = ?`, mIntSeqno);
}