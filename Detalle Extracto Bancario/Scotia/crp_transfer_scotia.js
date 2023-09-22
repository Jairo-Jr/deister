function crp_transfer_scotia(pIntNumRemesa, pStrDivisa) {

    /**
     * VARIABLES DE ENTRADA
     */
    var mIntNumrem = pIntNumRemesa;
    var mStrDivisa = pStrDivisa;
    var mStrMessageError = '';

    var mObjRemesa = Ax.db.executeQuery(`
        <select first = '1'>
            <columns>
                cremesas.ctafin     <alias name = 'cta_financiera' />,
                cremesas.jusser     <alias name = 'doc_remesa' />,
                cbancpro.codban     <alias name = 'cod_banco' />,
                cbancpro.moneda     <alias name = 'divisa' />
            </columns>
            <from table = 'cremesas'>
                <join table = 'cbancpro'>
                    <on>cremesas.ctafin = cbancpro.ctafin</on>
                </join>
            </from>
            <where>
                cremesas.numrem = ?
            </where>
        </select>
    `, mIntNumrem).toOne();

    //==========================================================================
    // Validación de datos de la remesa
    //==========================================================================
    if (mObjRemesa.divisa != pStrDivisa){
        mStrMessageError += `La moneda de la cuenta financiera [${mObjRemesa.cta_financiera}] de la remesa [${mObjRemesa.doc_remesa}] difiere de [${pStrDivisa}].\n`;
    }

    //==========================================================================
    // Datos necesarios del detalle de la trama de Scotia
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
                RPAD(TRIM(ctercero.cif), 11,' ')                                            <alias name = 'ruc_proveedor' />,
                RPAD(TRIM(ctercero.nombre), 60,' ')                                         <alias name = 'razon_social' />,
                RPAD(TRIM(cefectos.docser), 14,' ')                                         <alias name = 'num_factura' />,
                TO_CHAR(cefectos.fecha, '%Y%m%d')                                           <alias name = 'fecha_factura' />,
                ABS(cefecges_det.det_impdiv)                                                <alias name = 'monto_pago' />,
                CASE WHEN cterbanc.tipcta = 1 THEN '2'
                    WHEN cterbanc.tipcta = 2 THEN '3'
                    WHEN cterbanc.tipcta = 9 THEN '9'
                    ELSE '--'
                END                                                                         <alias name = 'forma_pago' />,
                CASE WHEN cterbanc.codban = '${mObjRemesa.cod_banco}' THEN SUBSTR(TRIM(cterbanc.iban),1,3)
                    ELSE '   '
                END                                                                         <alias name = 'cta_abono_oficina' />,
                CASE WHEN cterbanc.codban = '${mObjRemesa.cod_banco}' THEN SUBSTR(TRIM(cterbanc.iban),4,7)
                    ELSE '       '
                END                                                                         <alias name = 'cta_abono_bban' />,
                CASE WHEN cterbanc.codban != '${mObjRemesa.cod_banco}' 
                        AND LENGTH(TRIM(cterbanc.codban)) = 20 THEN TRIM(cterbanc.codban)
                    ELSE '       '
                END                                                                         <alias name = 'cta_abono_cci' />,
                ' '                                                                         <alias name = 'pago_unico' />,
                ' '                                                                         <alias name = 'factoring'/>,
                TO_CHAR(cefectos.fecven, '%Y%m%d')                                          <alias name = 'fecha_vencimiento' />,
                SUBSTR(ccontact.email1, 1, 30)                                              <alias name = 'email' />,
                cterbanc.moneda                                                             <alias name = 'moneda_tercero' />,
                cefectos.moneda                                                             <alias name = 'moneda_efecto' />,
                ctercero.codigo                                                             <alias name = 'cod_tercero' />


            </columns>
            <from table = 'cefecges_pcs'>
                <join table = 'cefecges_det'>
                    <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                    <join table = 'cefectos'>
                        <on>cefecges_det.det_numero = cefectos.numero</on>
                        <join table = 'ctercero'>
                            <on>cefectos.codper = ctercero.codigo</on>
                            <join type = 'left' table = 'cterbanc'>
                                <on>ctercero.codigo = cterbanc.codigo</on>
                            </join>
                            <join type = 'left' table = 'ccontact'>
                                <on>ctercero.codigo = ccontact.tercer</on>
                            </join>
                        </join>
                    </join>
                </join>
            </from>
            <where>
                cterbanc.tipcta IN (1,2,9)
                AND cefecges_pcs.pcs_numrem = ?
            </where>
            <order>
                6
            </order>
        </select>
    `, mIntNumrem).toJSONArray();

    mArrayDetalles.forEach(mObjDetalle => {
        /**
         * Validacion de datos necesarios
         */
        if (!mObjDetalle.forma_pago || mObjDetalle.forma_pago == '--'){
            mStrMessageError += `Tipo de cuenta de proveedor [${mObjDetalle.cod_tercero}] incorrecto para pagos.\n`;
        }
        if (!mObjDetalle.moneda_tercero || mObjDetalle.moneda_tercero != mStrDivisa){
            mStrMessageError += `La moneda de abono del dato bancario del proveedor [${mObjDetalle.cod_tercero}] es diferente de [${mStrDivisa}].\n`;
        }
        if (!mObjDetalle.moneda_efecto || mObjDetalle.moneda_efecto != mStrDivisa){
            mStrMessageError += `La moneda del efecto [${mObjDetalle.num_factura}] es diferente de [${mStrDivisa}].\n`;
        }

    });

    /**
     * Finaliza si algún dato necesario no está informado
     */
    if(mStrMessageError != '') {
        throw new Error(mStrMessageError);
    }

    var NumberFormatUs = new Ax.text.NumberFormat("us");

    mArrayDetalles.forEach(mObjDetalle => {
        // console.log(mObjDetalle);

        var mIntPos                  = mObjDetalle.num_factura.indexOf("-");
        var mStrSerie                = mObjDetalle.num_factura.substring(0, mIntPos);
        var mStrCorrelativo          = mObjDetalle.num_factura.substring(mIntPos+1, mObjDetalle.num_factura.length);
        var mStrCorrelativoFormato   = NumberFormatUs.format(mStrCorrelativo, "00000000");
        mObjDetalle.num_factura = mStrSerie + mStrCorrelativoFormato;


        var mStrImporteAbonarFormato = NumberFormatUs.format(mObjDetalle.monto_pago, "00000000000000.00");
        mObjDetalle.monto_pago = mStrImporteAbonarFormato;

        var mStrRowDetalle = new Ax.text.Line(175)
            .add(0,   mObjDetalle.ruc_proveedor)
            .add(11,  mObjDetalle.razon_social)
            .add(71,  mObjDetalle.num_factura)
            .add(85,  mObjDetalle.fecha_factura)
            .add(93,  mObjDetalle.monto_pago)

            .add(104, mObjDetalle.forma_pago)
            .add(105, mObjDetalle.cta_abono_oficina)
            .add(108, mObjDetalle.cta_abono_bban)
            .add(115, mObjDetalle.cta_abono_cci)
            .add(135, mObjDetalle.pago_unico)
            .add(136, mObjDetalle.factoring)
            .add(137, mObjDetalle.fecha_vencimiento)
            .add(145, mObjDetalle.email)
            .toString();
        mStrDetails += mStrRowDetalle + '\n';

        // mIntNumCtrlchecksum += __getNumCuentaCtrl(mObjDetalle.nmr_cuenta_abono);
    });

    /**
     * Se remueve el último salto de línea.
     */
    mStrDetails = mStrDetails.trimRight().replace(/\n$/, "");

    /**
     * Creacion del archivo txt
     */
    var mFileTxtTramaScotia = new Ax.sql.Blob(`transferScotia${mStrDivisa}.txt`);
    mFileTxtTramaScotia.setContentType("text/plain");
    mFileTxtTramaScotia.setContent(mStrDetails);

    /**
     * Variables con informacion para la respuesta
     */
    var mFileProc     = `crp_transfer_scotia_${mStrDivisa.toLowerCase()}`;
    var mFileName     = `transferScotia${mStrDivisa}.txt`;
    var mFileMemo     = `Transferencia Scotia ${mStrDivisa}`;
    var mStrFileArgs  = `Numero de remesa: ${mIntNumrem}`;
    var mHashMD5      = new Ax.crypt.Digest("MD5");
    var mStrHashTrama = mHashMD5.update(mFileTxtTramaScotia).digest();

    Ax.db.execute(`DELETE FROM csopmagn WHERE file_md5 = ?`, mStrHashTrama);

    var mObjInsertCsopmagn = {
        file_proc    : mFileProc,
        file_name    : mFileName,
        file_memo    : mFileMemo,
        file_args    : mStrFileArgs,
        file_type    : 'text/plain',
        file_size    : mFileTxtTramaScotia.length(),
        file_md5     : mStrHashTrama,
        file_data    : mFileTxtTramaScotia,
        user_created : Ax.db.getUser(),
        date_created : new Ax.util.Date(),
    };

    var mIntSeqno = Ax.db.insert('csopmagn', mObjInsertCsopmagn).getSerial();
    console.log('ID:', mIntSeqno);

    return Ax.db.executeQuery(`SELECT * FROM csopmagn WHERE file_seqno = ?`, mIntSeqno);
}
