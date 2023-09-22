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
 *  JS:  crp_remesas_factoring_sctbank
 *
 *  Version     : V1.0
 *  Date        : 2023.06.14
 *  Description : Genera un archivo txt con la trama de Factoring que se envíe
 *                a Scotiabank.
 *
 *
 *  CALLED FROM:
 *  ==================
 *
 *      OBJ (BUTTON 'ACTION_SOPORTE_ELEC')       cremesas
 *
 *  PARAMETERS:
 *  =============
 *
 *      @param   {Integer}   pIntNumrem    Identificador de una remesa
 *
 **/

function crp_remesas_factoring_sctbank(pIntNumrem){

    var mStrCuentaOrigen = Ax.db.executeGet(`SELECT ctafin FROM cremesas WHERE numrem = ?`, pIntNumrem);

    var mStrMessageError = '';

    //==========================================================================
    // Datos necesarios para concatenar el detalle de la trama de Scotiabank
    //
    // Forma de pago:
    //    1 Cheque de gerencia
    //    2 Abono en cuenta
    //    3 Abono en cuenta de ahorros
    //    4 Abono CCI
    //==========================================================================
    /*
    var mRsDetalle = Ax.db.executeQuery(`
        <select>
            <columns>
                cefectos.numero <alias name = 'numero' />,
                cefectos.docser <alias name = 'nro_factura' />,
                cefectos.impdiv <alias name = 'monto_pagar' />,
                cefectos.fecha  <alias name = 'fecha_factura' />,
                '000'           <alias name = 'oficina' />,
                'F'             <alias name = 'marca_factoring' />,
                cefectos.fecven <alias name = 'fecha_vencimiento' />,
                ctercero.cif    <alias name = 'ruc' />,
                ctercero.nombre <alias name = 'razon_social' />,
                cterdire.email  <alias name = 'email' />,
                cterbanc.iban   <alias name = 'cuenta' />,
                CASE
                    WHEN cterbanc.tipcta = 1 THEN 2
                    WHEN cterbanc.tipcta = 2 THEN 3
                    WHEN cterbanc.tipcta = 9 THEN 4
                END             <alias name = 'forma_pago' />
            </columns>
            <from table = 'cefectos'>
                <join table = 'ctercero'>
                    <on>cefectos.tercer = ctercero.codigo</on>
                    <join table = 'cterdire'>
                        <on>ctercero.codigo = cterdire.codigo</on>
                    </join>
                    <join table = 'cterbanc'>
                        <on>ctercero.codigo = cterbanc.codigo</on>
                    </join>
                </join>
            </from>
            <where>
                cefectos.remesa = ? AND cterdire.tipdir = 'AC'
            </where>
        </select>
    `, pIntNumrem).toMemory();
    */

    var mRsDetalle = Ax.db.executeQuery(`
        <select>
            <columns>
                ctercero.cif                 <alias name = 'ruc' />,
                ctercero.nombre              <alias name = 'razon_social' />,
                cefectos.docser              <alias name = 'nro_factura' />,
                cefectos.fecha               <alias name = 'fecha_factura' />,
                cefecges_det.det_impdiv      <alias name = 'monto_pagar' />,
                CASE
                    WHEN cterbanc.tipcta = 1 THEN 2
                    WHEN cterbanc.tipcta = 2 THEN 3
                    WHEN cterbanc.tipcta = 9 THEN 4
                    ELSE 2
                END                          <alias name = 'forma_pago' />,
                '000'                        <alias name = 'oficina' />,
                cterbanc.iban                <alias name = 'cuenta' />,
                cterdire.email               <alias name = 'email' />,
                'F'                          <alias name = 'marca_factoring' />, 
                cefectos.fecven              <alias name = 'fecha_vencimiento' />
            </columns>
            <from table = 'cefecges_pcs'>
                <join table = 'cefecges_det'>
                    <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                    <join table = 'cefectos'>
                        <on>cefecges_det.det_numero = cefectos.numero</on>
                        <join table = 'ctercero'>
                            <on>cefectos.codper = ctercero.codigo</on>
                            <join table = 'cterdire'>
                                <on>ctercero.codigo = cterdire.codigo</on>
                                <on>'0' = cterdire.tipdir</on>
                            </join>
                            <join table = 'cterbanc'>
                                <on>ctercero.codigo = cterbanc.codigo</on>
                            </join>
                        </join>
                    </join>
                </join>
            </from> 
            <where> 
                cterbanc.tipcta IN (0,1,2,3,4)
                AND cefecges_pcs.pcs_numrem = ? 
            </where>
            <order>1,8,6,4</order>
        </select>
    `, pIntNumrem).toMemory();



    //==========================================================================
    // Validación de los datos necesarios para el detalle de la trama de
    // Scotiabank
    //==========================================================================
    for (var mRowDetalle of mRsDetalle) {

        if (!mRowDetalle.ruc || mRowDetalle.ruc == 'NULL'){
            mStrMessageError += `RUC no informado para  ${mRowDetalle.nro_factura}.\n`;
        }

        if (!mRowDetalle.razon_social || mRowDetalle.razon_social == 'NULL'){
            mStrMessageError += `Razón social no informada para ${mRowDetalle.nro_factura}.\n`;
        }

        if (!mRowDetalle.nro_factura || mRowDetalle.nro_factura == 'NULL'){
            mStrMessageError += `Nro. de factura no informado para ${mRowDetalle.ruc}.\n`;
        }

        if (!mRowDetalle.fecha_factura || mRowDetalle.fecha_factura == 'NULL'){
            mStrMessageError += `Fecha de la factura no informada para ${mRowDetalle.nro_factura}.\n`;
        }

        if (!mRowDetalle.monto_pagar || mRowDetalle.monto_pagar == 'NULL'){
            mStrMessageError += `Monto a pagar no informado para ${mRowDetalle.nro_factura}.\n`;
        }

        if (!mRowDetalle.forma_pago || mRowDetalle.forma_pago == 'NULL'){
            mStrMessageError += `Forma de pago no informada para ${mRowDetalle.nro_factura}.\n`;
        }

        if (!mRowDetalle.oficina || mRowDetalle.oficina == 'NULL'){
            mStrMessageError += `Oficina no informada para ${mRowDetalle.nro_factura}.\n`;
        }

        if (!mRowDetalle.cuenta || mRowDetalle.cuenta == 'NULL'){
            mStrMessageError += `Cuenta no informada para ${mRowDetalle.nro_factura}.\n`;
        }
    }

    //==========================================================================
    // Finaliza si algún dato necesario no está informado
    //==========================================================================
    if(mStrMessageError != '') {
        throw new Error(mStrMessageError);
    }

    try {
        Ax.db.beginWork();

        var NumberFormatUs = new Ax.text.NumberFormat("us");

        //======================================================================
        // Concatenación del detalle de la trama de Scotiabank
        //======================================================================
        var mClobTramaDetalle = '';

        for (mRowDetalle of mRsDetalle) {
            var mIntPos                = mRowDetalle.nro_factura.indexOf("-");
            var mStrSerie              = mRowDetalle.nro_factura.substring(0, mIntPos);
            var mStrCorrelativo        = mRowDetalle.nro_factura.substring(mIntPos+1, mRowDetalle.nro_factura.length);
            var mStrCorrelativoFormato = NumberFormatUs.format(mStrCorrelativo, "0000000000");
            var mStrMontoFormato       = NumberFormatUs.format(mRowDetalle.monto_pagar, "000000000.00").replace('.','');

            var mStrRowDetalle = new Ax.text.Line(175)
                .add(0,   mRowDetalle.ruc)
                .add(11,  mRowDetalle.razon_social)
                .add(71,  mStrSerie)
                .add(75,  mStrCorrelativoFormato)
                .add(85,  mRowDetalle.fecha_factura.toString().replaceAll('-',''))
                .add(93,  mStrMontoFormato)
                .add(104, mRowDetalle.forma_pago)
                .add(105, mRowDetalle.oficina)
                .add(108, mRowDetalle.cuenta)
                .add(115, ' ')
                .add(116, mRowDetalle.email)
                .add(166, mRowDetalle.marca_factoring)
                .add(167, mRowDetalle.fecha_vencimiento.toString().replaceAll('-',''))
                .toString();
            mClobTramaDetalle += mStrRowDetalle + '\n';
        }

        mRsDetalle.close();

        //======================================================================
        // Creación del archivo txt con la trama para Scotiabank
        //======================================================================
        var mFileTxtTramaScotiabank = new Ax.sql.Blob(`tramaScotiabankRemesaNro${pIntNumrem}.txt`);
        mFileTxtTramaScotiabank.setContentType("text/plain");
        mFileTxtTramaScotiabank.setContent(mClobTramaDetalle);

        //======================================================================
        // Insert de la trama a la tabla de soporte electrónico [csopmagn]
        //======================================================================
        var mFileProc     = 'crp_remesas_factoring_sctbank';
        var mFileName     = `tramaScotiabankRemesaNro${pIntNumrem}.txt`;
        var mFileMemo     = 'REMESAS DE PAGO - FACTORING';
        var mStrFileArgs  = `Factoring Scotiabank: cuenta origen ${mStrCuentaOrigen}`;
        var mHashMD5      = new Ax.crypt.Digest("MD5");
        var mStrHashTrama = mHashMD5.update(mFileTxtTramaScotiabank).digest();

        Ax.db.execute(`DELETE FROM csopmagn WHERE file_md5 = ?`, mStrHashTrama);

        var mObjInsertCsopmagn = {
            file_proc    : mFileProc,
            file_name    : mFileName,
            file_memo    : mFileMemo,
            file_args    : mStrFileArgs,
            file_type    : 'text/plain',
            file_size    : mFileTxtTramaScotiabank.length(),
            file_md5     : mStrHashTrama,
            file_data    : mFileTxtTramaScotiabank,
            user_created : Ax.db.getUser(),
            date_created : new Ax.util.Date(),
        }

        var mIntSeqno = Ax.db.insert('csopmagn', mObjInsertCsopmagn).getSerial();

        Ax.db.commitWork();

        //======================================================================
        // Se recupera los datos para mostrar en el reporte
        //======================================================================
        return Ax.db.executeQuery(`SELECT * FROM csopmagn WHERE file_seqno = ?`, mIntSeqno);

    } catch (error) {

        Ax.db.rollbackWork();

        return error;
    }
}