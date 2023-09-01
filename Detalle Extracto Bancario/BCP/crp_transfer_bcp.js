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
 *  Version     : v1.3
 *  Date        : 28-08-2023
 *  Description : Función que genera un archivo txt para pagos masivos
 *                a proveedores a través de la remesa.
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
function crp_transfer_bcp(pIntNumRemesa) {

    /**
     * LOCAL FUNCTION: __getFormatData
     *
     * Description:
     *
     * PARAMETERS:
     *      @param  {string}       pStrCadena           Cadena de texto a dar formato
     *      @param  {string}       pStrCaracter         Caracter usado para completar
     *      @param  {integer}      mIntNumDigitos       Numero de digitos total del texto final
     *      @param  {string}       pStrOrden            Posicion a completar digitos [I/Izquierda] [D/Derecha]
     */
    function __getFormatData(pStrCadena, pStrCaracter, mIntNumDigitos, pStrOrden) {

        pStrCadena = pStrCadena.toString();
        var mIntNumDigOri = pStrCadena.length;
        var mIntNumDigRest = mIntNumDigitos - mIntNumDigOri;
        var mStrCadenaFormat = pStrCadena;

        for (var i = 0; i < mIntNumDigRest; i++) {
            if (pStrOrden == 'D') {
                mStrCadenaFormat = mStrCadenaFormat + pStrCaracter;
            } else if (pStrOrden == 'I') {
                mStrCadenaFormat = pStrCaracter + mStrCadenaFormat;
            }
        }

        return mStrCadenaFormat;

    }

    /**
     * LOCAL FUNCTION: __getEstructuraCabecera
     *
     * Description:
     *
     * PARAMETERS:
     *      @param  {integer}       pIntNumRemesa       Numero de la remesa
     */
    function __getEstructuraCabecera(pIntNumRemesa) {

        /**
         * Obtención de data
         */
        const mArrayEfectos = Ax.db.executeQuery(`
            <select>
                <columns>
                    ctercero.codigo
                </columns>
                <from table='cefectos'>
                    <join table='ctercero'>
                        <on>cefectos.tercer = ctercero.codigo</on>
                    </join>
                </from>
                <where>
                    cefectos.remesa  = ?
                </where>
                <group>
                    1
                </group>
            </select>
        `, pIntNumRemesa).toJSONArray();

        /**
         * Datos remesa
         */
        const mObjRemesa = Ax.db.executeQuery(`
            <select>
                <columns>
                    cremesas.fecrem,
                    CASE WHEN cbancpro.agrcta = 'CC' THEN 'C'
                        ELSE 'M'
                    END agrcta,
                    CASE WHEN cbancpro.moneda = 'PEN' THEN '0001'
                        WHEN cbancpro.moneda = 'USD' THEN '1001'
                        ELSE '----'
                    END moneda,
                    NVL(cbancpro.bban, '') bban,
                    cremesas.imptot,
                    cremesas.jusser
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
        `, pIntNumRemesa).toOne();


        /**
         * Desarrollo de estructura
         */
        var mStrTipReg = '1';
        var mIntCantAbono = __getFormatData(mArrayEfectos.length, '0', 6, 'I');
        var mStrFecRegistro = mObjRemesa.fecrem.toString().replaceAll('-', '');
        var mStrTipCuenta = mObjRemesa.agrcta;
        var mStrMoneda = mObjRemesa.moneda;
        var mStrNumCuentaCargo = __getFormatData(mObjRemesa.bban, ' ', 20, 'D');
        var mStrImportTotal = __getFormatData(mObjRemesa.imptot, '0', 17, 'I');
        var mStrRefPlanilla = __getFormatData(mObjRemesa.jusser, ' ', 40, 'D');
        var mStrFlagITF = 'N';
        var mStrCtrlChecksum = '000968270421455';   // Por validar el correcto valor

        var mStrHeader = mStrTipReg +
            mIntCantAbono +
            mStrFecRegistro +
            mStrTipCuenta +
            mStrMoneda +
            mStrNumCuentaCargo +
            mStrImportTotal +
            mStrRefPlanilla +
            mStrFlagITF +
            mStrCtrlChecksum;
        return mStrHeader;
    }

    /**
     * LOCAL FUNCTION: __getEstructuraDetalle
     *
     * Description:
     *
     * PARAMETERS:
     *      @param  {Object}        mObjDataTercer      Data del tercer
     *      @param  {Float}         pFloatImpTot        Importe correspondiente al tercer
     */
    function __getEstructuraDetalle(mObjDataTercer, pFloatImpTot) {

        /**
         * Desarrollo de estructura
         */
        var mStrTipReg = '2';
        var mStrTipCuenta = mObjDataTercer.tipcta;
        var mStrNumCtaAbono = __getFormatData(mObjDataTercer.iban, ' ', 20, 'D');
        var mStrModPAgo = '1';
        var mStrTipDocProveedor = mObjDataTercer.ciftyp;
        var mStrNumDocProveedor = __getFormatData(mObjDataTercer.cif, ' ', 12, 'D');
        var mStrCorrelativoDoc = '   ';
        var mStrNomProveedor = __getFormatData(mObjDataTercer.nombre, ' ', 75, 'D');
        var mStrRefBeneficiario = __getFormatData(' ', ' ', 40, 'D');
        var mStrRefEmpresa = __getFormatData(' ', ' ', 20, 'D');
        var mStrMoneda = '0001';
        var mStrImpAbonar = __getFormatData(Math.abs(pFloatImpTot), '0', 17, 'I');
        var mStrFlagIDC = 'S';

        var mStrDetalle = '\n' +
            mStrTipReg +
            mStrTipCuenta +
            mStrNumCtaAbono +
            mStrModPAgo +
            mStrTipDocProveedor +
            mStrNumDocProveedor +
            mStrCorrelativoDoc +
            mStrNomProveedor +
            mStrRefBeneficiario +
            mStrRefEmpresa +
            mStrMoneda +
            mStrImpAbonar +
            mStrFlagIDC;
        return mStrDetalle;
    }

    /**
     * VARIABLES DE ENTRADA
     */
    var mIntNumrem = pIntNumRemesa;

    /**
     * CONSTRUCCION DEL ENCABEZADO
     */
    var mStrHeader = __getEstructuraCabecera(mIntNumrem);

    /**
     * CONSTRUCCION DE LOS DETALLES
     */
    var mStrDetails = '';
    var mArrayTerceros = Ax.db.executeQuery(`
        <select>
            <columns>
                cefectos.tercer,
                cefectos.impdiv
                <!-- SUM(cefectos.impdiv) impdiv -->
            </columns>
            <from table="cefectos">
                <join table='ctercero'>
                    <on>cefectos.tercer = ctercero.codigo</on>
                </join>  
            </from>
            <where>
                cefectos.remesa  = ?
            </where>
            <!-- <group>
                1
            </group> -->
        </select>
    `, mIntNumrem);

    mArrayTerceros.forEach(mObjTercer => {

        var mObjDataTercer = Ax.db.executeQuery(`
            <select first='1'>
                <columns>
                    CASE WHEN cterbanc.tipcta = 1 THEN 'C'
                         WHEN cterbanc.tipcta = 2 THEN 'A'
                         WHEN cterbanc.tipcta = 3 THEN 'M'
                         WHEN cterbanc.tipcta = 4 THEN 'M'
                         ELSE 'C'
                    END tipcta,
                    cterbanc.iban,
                    CASE WHEN ctercero.ciftyp = 1 THEN '1'
                         WHEN ctercero.ciftyp = 4 THEN '3'
                         WHEN ctercero.ciftyp = 6 THEN '6'
                         WHEN ctercero.ciftyp = 7 THEN '4'
                         ELSE '6'
                    END ciftyp,
                    ctercero.cif,
                    ctercero.nombre
                </columns>
                <from table="ctercero">
                    <join table='cterbanc'>
                        <on>ctercero.codigo = cterbanc.codigo</on>
                    </join>  
                </from>
                <where>
                    cterbanc.tipcta IN (1,2,3,4)
                    AND ctercero.codigo  = ?
                </where>
            </select>
        `, mObjTercer.tercer).toOne();
        if(mObjDataTercer.cif == null) {
            throw `Tipo de cuenta no valido para el tercero [${mObjTercer.tercer}]`;
        } else {
            mStrDetails += __getEstructuraDetalle(mObjDataTercer, mObjTercer.impdiv);
        }

    });

    var mStrBodyTxt = mStrHeader + mStrDetails;

    /**
     * Creacion del archivo txt
     */
    var mFileTxtTramaBCP = new Ax.sql.Blob(`transferBCPSoles.txt`);
    mFileTxtTramaBCP.setContentType("text/plain");
    mFileTxtTramaBCP.setContent(mStrBodyTxt);

    /**
     * Variables con informacion para la respuesta
     */
    var mFileProc     = 'crp_transfer_bcp_pen';
    var mFileName     = `transferBCPSoles.txt`;
    var mFileMemo     = 'Transferencia BCP soles';
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