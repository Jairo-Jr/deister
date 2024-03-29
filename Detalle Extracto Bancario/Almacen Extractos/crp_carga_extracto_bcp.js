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
 *  JS:  crp_carga_extracto_bcp
 *
 *  Version     : v1.8
 *  Date        : 2023-10-24
 *  Description : Generación de extractos bancarios para cuentas BCP, a partir
 *                de la lectura de archivo Excel.
 *
 *
 *
 *  CALLED FROM:
 *
 *      Obj: textract_file        Atravez de la accion 'ACTION_BUTTON_163'
 *
 *
 *  PARAMETERS:
 *
 *      @param  {integer}   pIntFileId      Identificador de fichero
 *
 */
function crp_carga_extracto_bcp(pIntFileId) {

    function __getValidarCampos(pObjRowSheet) {
        var mStrMsgError = '';
        if(pObjRowSheet.A == null){
            mStrMsgError += `Línea [${pObjRowSheet.Row}] - Valor inexistente para el campo Fecha [Col-A]`;
        }
        if(pObjRowSheet.D == null){
            mStrMsgError += `Línea [${pObjRowSheet.Row}] - Valor inexistente para el campo Monto [Col-D]`;
        }
        if(pObjRowSheet.E == null){
            mStrMsgError += `Línea [${pObjRowSheet.Row}] - Valor inexistente para el campo Saldo [Col-E]`;
        }
        if(pObjRowSheet.J == null){
            mStrMsgError += `Línea [${pObjRowSheet.Row}] - Valor inexistente para el campo UTC [Col-J]`;
        }
    }

    function __validaConceptoPropio(pStrConcepProp, pStrCodBanc, pStrDescripConcep) {
        var mStrConcepProp = Ax.db.executeGet(`
            <select>
                <columns>
                    codpro
                </columns>
                <from table='tconprop'/>
                <where>
                    tconprop.codban = ?
                    AND  tconprop.codpro = ?
                </where>
            </select>
        `, pStrCodBanc, pStrConcepProp);
        var mBoolCodValido = (mStrConcepProp != null) ? true : false;

        if (!mBoolCodValido) {
            Ax.db.insert('tconprop', {
                codban: pStrCodBanc,
                codpro: pStrConcepProp,
                nompro: pStrDescripConcep,
                coddom: pStrConcepProp
            });
        }

        // return (mStrConcepProp != null) ? true : false;
    }

    /**
     * Captura del archivo Excel
     */
    let mObjBlobData = Ax.db.executeGet(`
        <select>
            <columns>
                file_data
            </columns>
            <from table='textract_file'/>
            <where>
                file_seqno = ?
            </where>
        </select>
    `, pIntFileId);

    /**
     * Transformacion de la data del archivo en resultset
     */
    var wb = Ax.ms.Excel.load(mObjBlobData);
    var mXlsSheet = wb.getSheet(0);
    mXlsSheet.packRows();
    var mIntNumRow = mXlsSheet.getLastRowNum();
    var mRsSheet = mXlsSheet.toResultSet();

    /**
     * Variables
     */
    var mStrNumCuenta = '';
    var mStrCodCtaFin = '';
    var mStrCodBan = '';
    var mStrMoneda = '';
    var mStrTipoCuenta = '';
    var mDateFecExtCierre = '';
    var mDateFecExtracto = '';
    var mFloatImporteExt = 0;
    var mFloatSaldoCierre = 0;
    var mFloatSaldoApertura = 0;
    var mObjDivisa = {
        'Dólares': 'USD',
        'Soles': 'PEN'
    }
    /**
     * Equivalencia para conceptos propios
     */
    var mObjConcepPropio = {
        '0101': '00002',
        '4405': '00002',
        '0909': '00003',
        '2004': '00004',
        '4406': '00175',
        '4981': '01549',
        '4991': '01579',
        '4921': '00086',
        '4903': '01210',
        '1013': '00027',
        '2001': '03388',
        '2014': '00205',
        '2406': '03496',
        '2605': '00399',
        '2617': '00295',
        '2901': '00453',
        '3001': '00501',
        '3002': '00502',
        '4009': '01051',
        '2401': '01147',
        '4033': '01403',
        '4043': '01060',
        '4401': '00622',
        '4404': '01134',
        '4510': '00352',
        '4708': '00772',
        '4709': '03447',
        '4923': '03448',
        '4983': '00560',
        '4901': '00333',
        '4984': '01561'
    }

    /**
     * Numerador de linea
     *  - 1: Numero de cuenta
     *  - 2: Divisa
     *  - 3: Tipo de cuenta
     *  - 6: Informacion para el extracto
     */
    var i = 1;
    mRsSheet.forEach(mRowSheet => {

        /**
         * Numero de cuenta
         */
        if (mRowSheet.Row == 1){
            mStrNumCuenta = mRowSheet.B.replaceAll('-', '').split(' ')[0];

        }

        /**
         * Tipo de la divisa
         *  - Soles
         *  - Dólares
         */
        if (mRowSheet.Row == 2){
            mStrMoneda = mObjDivisa[mRowSheet.B];

            if(mStrMoneda == undefined ) {
                throw `Tipo de moneda no contemplado, solo [Soles - Dólares]`;
            }

            var mArrayCbankPro = Ax.db.executeQuery(`
                <select>
                    <columns>
                        ctafin, codban, salext, fecext
                    </columns>
                    <from table='cbancpro'/>
                    <where>
                        bban = ?
                        AND moneda = ?
                        AND estado = 'A'
                        AND tipcta = 1
                    </where>
                </select>
            `, mStrNumCuenta, mStrMoneda).toJSONArray();

            if(mArrayCbankPro.length == 0) {
                throw `No existe una cuenta financiera con BBAN [${mStrNumCuenta}] y Moneda [${mStrMoneda}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
            } else if(mArrayCbankPro.length > 1) {
                throw `Existe más de una cuenta financiera con BBAN [${mStrNumCuenta}] y Moneda [${mStrMoneda}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
            } else {
                mStrCodCtaFin    = mArrayCbankPro[0].ctafin;
                mStrCodBan       = mArrayCbankPro[0].codban;
                mFloatImporteExt = mArrayCbankPro[0].salext;
                mDateFecExtracto = mArrayCbankPro[0].fecext;
            }
        }
        if (mRowSheet.Row == 3){
            mStrTipoCuenta = mRowSheet.B;
        }

        if (mRowSheet.Row == 6){
            mDateFecExtCierre = new Ax.util.Date(mRowSheet.A);
        }

        if (mRowSheet.Row >= 6) {

            /**
             * Cambio de signo a el monto y saldo
             */
            mRowSheet.D = parseFloat(mRowSheet.D) * -1;
            mRowSheet.E = parseFloat(mRowSheet.E) * -1;

            __getValidarCampos(mRowSheet);


            /**
             *  Validacion de concepto propio
             */
            __validaConceptoPropio(mRowSheet.J, mStrCodBan, mRowSheet.C);
            // var mBoolConcepValido = __validaConceptoPropio(mRowSheet.J, mStrCodBan, mRowSheet.C);
            // if(!mBoolConcepValido) {
            //     throw `Concepto propio [${mRowSheet.J}] no contemplado en [tconprop] para el código de banco [${mStrCodBan}].`;
            // }


            var mObjTextract = {
                file_seqno: pIntFileId,
                fecope: mRowSheet.A,
                fecval: mRowSheet.B == null ? mRowSheet.A : mRowSheet.B,
                refer1: mRowSheet.C,//
                import: mRowSheet.D,
                refer2: mRowSheet.F,//
                docume: mRowSheet.G,//
                ctafin: mStrCodCtaFin,
                empcode: '125',
                codban: mStrCodBan,
                ccc1: mStrNumCuenta.substring(0,3),
                ccc2: mStrNumCuenta.substring(3,6),
                ctacte: mStrNumCuenta.substring(6),
                concom: '00',
                conpro: mRowSheet.J,
                divisa: mStrMoneda
            }
            i++;
            mFloatSaldoCierre += mRowSheet.D;

            if (mRowSheet.Row == mIntNumRow + 1) {
                /**
                 * Validación de fecha y saldo del extracto
                 */
                /**
                 * Calculo del saldo para la cuenta financiera
                 */
                mFloatSaldoApertura = parseFloat(mRowSheet.E) - parseFloat(mRowSheet.D);
                mFloatSaldoApertura = mFloatSaldoApertura.toFixed(2);

                var mDateFechaInicio = new Ax.util.Date(mRowSheet.A);
                if(mDateFecExtracto == null) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}/${mFloatSaldoApertura}]`;}

                mDateFechaInicio = mDateFechaInicio.addDay(-1);
                var mDateCbancproFecExtracto = new Ax.util.Date(mDateFecExtracto);

                if(!(mDateCbancproFecExtracto <= mDateFechaInicio)) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}/${mFloatSaldoApertura}]`;}
                if(mFloatSaldoApertura != mFloatImporteExt) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}/${mFloatSaldoApertura}]`;}
            }

            /**
             * Registro del extracto bancario
             */
            Ax.db.insert("textract", mObjTextract);
        }

    })
    /**
     * Calculo del saldo de cierre
     */
    mFloatSaldoCierre += parseFloat(mFloatSaldoApertura);

    /**
     * Se actualiza el estado del almacen de fichero (textract_file)
     */
    Ax.db.update("textract_file",
        {
            file_estado : 1
        },
        {
            file_seqno : pIntFileId
        }
    );

    /**
     * Se actualiza el saldo y fecha de la cuenta financiera (cbancpro)
     */
    Ax.db.update("cbancpro",
        {
            salext : mFloatSaldoCierre,
            fecext : mDateFecExtCierre
        },
        {
            bban: mStrNumCuenta,
            moneda: mStrMoneda,
            estado: 'A',
            tipcta: 1
        }
    );
}