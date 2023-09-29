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
 *  JS:  crp_transfer_bbva_pen
 *
 *  Version     : V1.6
 *  Date        : 2023.09.26
 *  Description : Genera un archivo txt de transferencias prov. para BBVA
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
function crp_transfer_bbva_pen(pIntNumrem){

    //==========================================================================
    // Recuperamos número de remesa, estado y acción para enlazar con su gestión
    // Si no está cerrada salimos del proceso para evitar inconsistencias
    //
    //==========================================================================
    var mStrMessageError = '';
    var mStrCuentaOrigen = Ax.db.executeGet(`SELECT ctafin FROM cremesas WHERE numrem = ?`, pIntNumrem);

    //==========================================================================
    // Datos necesarios de la cabecera de la trama de BBVA
    //
    //==========================================================================
    var mObjCabecera = Ax.db.executeQuery(`
        <select first = '1'>
            <columns>
                cremesas.estrem,
                '750'            <alias name = 'tipo_registro' />,
                NVL(cbancpro.bban, cbancpro.iban)   <alias name = 'cuenta_cargo' />,
                cbancpro.moneda  <alias name = 'moneda_cuenta' />,
                cremesas.imptot  <alias name = 'importe_cargar' />,
                'A'              <alias name = 'tipo_proceso' />,
                cremesas.fecrem  <alias name = 'fecha_proceso' />,
                'S'              <alias name = 'validacion_pertenencia' />,
                cbancpro.codban,
                cbancpro.moneda,
                cbancpro.tipcta
            </columns>
            <from table = 'cremesas'>
                <join table = 'cbancpro'>
                    <on>cbancpro.ctafin = cremesas.ctafin</on>
                </join>
            </from>
            <where> 
                cremesas.numrem = ?
            </where>
        </select>
    `, pIntNumrem).toOne();

    var mIntTotalEfectos = Ax.db.executeGet(`
        <select>
            <columns>
                COUNT(*)
            </columns>
            <from table="cefecges_pcs">
                <join table="cefecges_det">
                    <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                </join>
            </from>
            <where>
                cefecges_pcs.pcs_numrem  = ?
            </where>
        </select>
    `, pIntNumrem);
    var mIntTotalEfectosAgrupados    = 0;

    //==========================================================================
    // Validación de los datos necesarios para la cabecera de la trama de BBVA
    //==========================================================================
    if (!mObjCabecera.estrem || mObjCabecera.estrem != 'C'){
        mStrMessageError += `Estado '${mObjCabecera.estrem}' no permite emitir fichero para la remesa nro. ${pIntNumrem}.\n`;
    }

    if (!mObjCabecera.cuenta_cargo || mObjCabecera.cuenta_cargo == 'NULL'){
        mStrMessageError += `Nro. de cuenta no informado para la remesa nro. ${pIntNumrem}.\n`;
    }

    if (!mObjCabecera.moneda_cuenta || mObjCabecera.moneda_cuenta == 'NULL'){
        mStrMessageError += `Moneda de la cuenta no informada para la remesa nro. ${pIntNumrem}.\n`;
    }

    if (!mObjCabecera.importe_cargar || mObjCabecera.importe_cargar == 'NULL'){
        mStrMessageError += `Importe a cargar no informado para la remesa nro. ${pIntNumrem}.\n`;
    }

    //==========================================================================
    // Variables asociadas al agrupamiento dinámico
    //==========================================================================
    var mStrAbonoAgrupado = 'N';


    //==========================================================================
    // Datos necesarios del detalle de la trama de BBVA
    // doi_tipo (tipo de documento de identidad) Por defecto sera L:
    //      L -> DNI o libreta electoral
    //      R -> RUC
    //      M -> Carné Militar
    //      E -> Carné de Extranjería
    //      P -> Pasaporte
    // tipo_abono (tipo de cuenta para realizar el abono):
    //      P -> Propio banco
    //      I -> Interbancario
    // abono_agrupado
    //      N -> Individual factura a factura  (no lo usamos)
    //      S -> Agrupado  Total neto por perceptor, permite compensar
    // Importe a abonar
    //      SUMA de los det_impdiv del detalle de gestión, según el grupo que
    //      marca det_agrupa Podemos pagar parcialmente el valor de un efecto
    //      y además pagar a un tercero diversas factuars menos notas de crédito
    //      y posibles compensaciones de cobros.
    //
    //==========================================================================

    var mRsDetalle = Ax.db.executeQuery(`
        <select>
            <columns>
                cefecges_det.det_agrupa                                     <alias name = 'det_agrupa' />,
                '002'                                                       <alias name = 'tipo_registro' />,
                MAX(CASE WHEN ctercero.ciftyp = 1 THEN 'L'
                         WHEN ctercero.ciftyp = 6 THEN 'R'
                         WHEN ctercero.ciftyp = 0 THEN 'M'
                         WHEN ctercero.ciftyp = 4 THEN 'E'
                         WHEN ctercero.ciftyp = 7 THEN 'P'
                         ELSE 'L'
                    END)                                                    <alias name = 'doi_tipo' />,
                MAX(ctercero.cif)                                           <alias name = 'doi_numero' />,
                MAX(CASE WHEN cterbanc.codban = '${mObjCabecera.codban}' THEN 'P'
                         ELSE 'I'
                    END)                                                    <alias name = 'tipo_abono' />,
                MAX(cterbanc.codban)                                        <alias name = 'codigo_banco' />,
                MAX(cterbanc.iban)                                          <alias name = 'nro_cuenta_abono' />,
                MAX(ctercero.nombre)                                        <alias name = 'nombre_beneficiario' />,
                MAX(ctercero.codigo)                                        <alias name = 'cod_tercero' />,
                SUM(cefecges_det.det_impdiv)                                <alias name = 'importe_abonar' />,
                MAX(CASE WHEN cefectos.auxchr4 = '01' THEN 'F'
                         WHEN cefectos.auxchr4 = '03' THEN 'B'
                         WHEN cefectos.auxchr4 = '07' THEN 'N'
                         ELSE 'F'
                    END)                                                    <alias name = 'tipo_documento' />,
                MAX(cefectos.docser)                                        <alias name = 'nro_documento'  />,
                ''                                                          <alias name = 'abono_agrupado' />
            </columns>
            <from table = 'cefecges_pcs'>
                <join table = 'cefecges_det'>
                    <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                    <join table = 'cefectos'>
                        <on>cefecges_det.det_numero = cefectos.numero</on>
                        <join table = 'ctercero'>
                            <on>cefectos.codper = ctercero.codigo</on>
                        </join>
                        <join type = 'left' table = 'cterbanc'>
                            <on>cefectos.codper = cterbanc.codigo</on>
                            <on>cefectos.numban = cterbanc.numban</on>
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
            <order>1,3,5,6</order>
        </select>
    `, pIntNumrem).toJSONArray();

    mIntTotalEfectosAgrupados = mRsDetalle.length;

    // Determinacion si el abono es agrupado
    if (mIntTotalEfectos != mIntTotalEfectosAgrupados) {
        mStrAbonoAgrupado = 'S';
    }

    //==========================================================================
    // Validación de los datos necesarios para el detalle de la trama de BBVA
    //==========================================================================
    for (var mRowDetalle of mRsDetalle) {

        if (!mRowDetalle.doi_tipo || mRowDetalle.doi_tipo == 'NULL'){
            mStrMessageError += `Tipo de documento de identidad no informado para perceptor ${mRowDetalle.cod_tercero}.\n`;
        }

        if (!mRowDetalle.doi_numero || mRowDetalle.doi_numero == 'NULL'){
            mStrMessageError += `Nro. de documento de identidad no informado para perceptor ${mRowDetalle.cod_tercero}.\n`;
        }

        if (!mRowDetalle.tipo_abono || mRowDetalle.tipo_abono == 'NULL'){
            mStrMessageError += `Tipo de abono no informado en deuda de perceptor ${mRowDetalle.cod_tercero}.\n`;
        }

        if (!mRowDetalle.nro_cuenta_abono || mRowDetalle.nro_cuenta_abono == 'NULL'){
            mStrMessageError += `Nro. de cuenta para abonar no informado para deuda de perceptor ${mRowDetalle.cod_tercero}.\n`;
        }

        if (!mRowDetalle.nombre_beneficiario || mRowDetalle.nombre_beneficiario == 'NULL'){
            mStrMessageError += `Nombre de beneficiario no informado para deuda de perceptor. ${mRowDetalle.cod_tercero}.\n`;
        }

        if (!mRowDetalle.importe_abonar || mRowDetalle.importe_abonar == 'NULL'){
            mStrMessageError += `Importe para abonar no informado para perceptor. ${mRowDetalle.cod_tercero}.\n`;
        }

        if (!mRowDetalle.tipo_documento || mRowDetalle.tipo_documento == 'NULL'){
            mStrMessageError += `Tipo de documento no informado paradeudda de  ${mRowDetalle.cod_tercero}.\n`;
        }

        if (!mRowDetalle.nro_documento || mRowDetalle.nro_documento == 'NULL'){
            mStrMessageError += `Nro. de documento no informado para deuda de  ${mRowDetalle.cod_tercero}.\n`;
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
        // Concatenación de la cabecera de la trama de BBVA
        //======================================================================
        var mStrTotalRegistrosFormato = NumberFormatUs.format(mIntTotalEfectosAgrupados, "000000");
        var mStrImporteTotalFormato   = NumberFormatUs.format(mObjCabecera.importe_cargar, "0000000000000.00").replace('.','');

        var mClobTramaCabecera = new Ax.text.Line(151)
            .add(0,   mObjCabecera.tipo_registro)
            .add(3,   mObjCabecera.cuenta_cargo)
            .add(23,  mObjCabecera.moneda_cuenta)
            .add(26,  mStrImporteTotalFormato)
            .add(41,  mObjCabecera.tipo_proceso)
            .add(42,  mObjCabecera.fecha_proceso.toString().replaceAll('-',''))
            //.add(50,  )
            //.add(51,  )
            .add(76,  mStrTotalRegistrosFormato)
            .add(82,  mObjCabecera.validacion_pertenencia)
            .toString();

        //======================================================================
        // Concatenación del detalle de la trama de BBVA
        //======================================================================
        var mClobTramaDetalle = '';

        for (mRowDetalle of mRsDetalle) {

            var mIntPos                  = mRowDetalle.nro_documento.indexOf("-");
            var mStrSerie                = mRowDetalle.nro_documento.substring(0, mIntPos);
            var mStrCorrelativo          = mRowDetalle.nro_documento.substring(mIntPos+1, mRowDetalle.nro_documento.length);
            var mStrCorrelativoFormato   = NumberFormatUs.format(mStrCorrelativo, "00000000");
            var mStrImporteAbonarFormato = NumberFormatUs.format(mRowDetalle.importe_abonar, "0000000000000.00").replace('.','');

            var mStrRowDetalle = new Ax.text.Line(277)
                .add(0,   mRowDetalle.tipo_registro)
                .add(3,   mRowDetalle.doi_tipo)
                .add(4,   mRowDetalle.doi_numero)
                .add(16,  mRowDetalle.tipo_abono)
                .add(17,  mRowDetalle.nro_cuenta_abono)
                .add(37,  mRowDetalle.nombre_beneficiario)
                .add(77,  mStrImporteAbonarFormato)
                .add(92,  mRowDetalle.tipo_documento)
                .add(93,  mStrSerie)
                .add(97,  mStrCorrelativoFormato)
                .add(105, mStrAbonoAgrupado)
                .toString();
            mClobTramaDetalle += '\n' + mStrRowDetalle;
        }


        var mClobTrama = mClobTramaCabecera + mClobTramaDetalle;

        //======================================================================
        // Creación del archivo txt con la trama para BBVA
        //======================================================================
        var mFileTxtTramaBBVA = new Ax.sql.Blob(`tramaBBVARemesaNro${pIntNumrem}.txt`);
            mFileTxtTramaBBVA.setContentType("text/plain");
            mFileTxtTramaBBVA.setContent(mClobTrama);

        //======================================================================
        // Insert de la trama a la tabla de soporte electrónico [csopmagn]
        //======================================================================
        var mFileProc     = 'crp_remesas_factoring_bbva';
        var mFileName     = `tramaBBVARemesaNro${pIntNumrem}.txt`;
        var mFileMemo     = 'REMESAS DE PAGO - FACTORING';
        var mStrFileArgs  = `Factoring BBVA: cuenta origen ${mStrCuentaOrigen}`;
        var mHashMD5      = new Ax.crypt.Digest("MD5");
        var mStrHashTrama = mHashMD5.update(mFileTxtTramaBBVA).digest();

        Ax.db.execute(`DELETE FROM csopmagn WHERE file_md5 = ?`, mStrHashTrama);

        var mObjInsertCsopmagn = {
            file_proc    : mFileProc,
            file_name    : mFileName,
            file_memo    : mFileMemo,
            file_args    : mStrFileArgs,
            file_type    : 'text/plain',
            file_size    : mFileTxtTramaBBVA.length(),
            file_md5     : mStrHashTrama,
            file_data    : mFileTxtTramaBBVA,
            user_created : Ax.db.getUser(),
            date_created : new Ax.util.Date(),
        };

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