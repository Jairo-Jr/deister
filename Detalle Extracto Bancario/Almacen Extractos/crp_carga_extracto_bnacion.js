
function crp_carga_extracto_bnacion(pIntFileId) {

    function __getValidarCampos(pObjRowSheet) {
        var mStrMsgError = '';
        if(pObjRowSheet.B == null){
            mStrMsgError += `Línea [${pObjRowSheet.Row}] - Valor inexistente para el campo Fecha [Col-B]`;
        }
        if(pObjRowSheet.F == null){
            mStrMsgError += `Línea [${pObjRowSheet.Row}] - Valor inexistente para el campo Oficina [Col-F]`;
        }
        if((pObjRowSheet.G == null && pObjRowSheet.H == null) || (pObjRowSheet.G != null && pObjRowSheet.H != null)){
            mStrMsgError += `Línea [${pObjRowSheet.Row}] - solo uno de los campos debería estar informado Cargo [Col-G]/Abono [Col-H]`;
        }
    }

    function __getConceptoPropio(pStrConcepProp, pStrCodBanc) {
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
        return mStrConcepProp;
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

    // var mXlsSheet = mWbWorkbook.getSheet(0);
    var wb = Ax.ms.Excel.load(mObjBlobData);
    var mXlsSheet = wb.getSheet(0);
    // mXlsSheet.packRows();
    var mIntNumRow = mXlsSheet.getLastRowNum();
    var mRsSheet = mXlsSheet.toResultSet();
    // console.log('Num Row:', mIntNumRow);
    // console.log(mRsSheet);

    /**
     * Variables
     */
    var mStrNumCuenta = '';
    var mStrCodCtaFin = '';
    var mStrCodBan = '';
    var mStrMoneda = '';
    var mStrTipoCuenta = '';
    var mDateFecExtracto = '';
    var mDateFecExtCierre = '';
    var mStrConcepPropio = '';
    var mFloatSaldoExtBanc = 0;
    var mFloatSaldoCierre = 0;
    var mFloatSaldoApertura = 0;
    var mFloatSaldoCtaFin = 0;
    var mFloatImportExt = 0;
    var mObjDivisa = {
        'Dólares': 'USD',
        'Soles': 'PEN'
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
        var mObjRow = {
            Row: mRowSheet.Row,
            A: mRowSheet.A,
            B: mRowSheet.B,
            C: mRowSheet.C,
            D: mRowSheet.D,
            E: mRowSheet.E,
            F: mRowSheet.F,
            G: mRowSheet.G,
            H: mRowSheet.H
        }

        /**
         * Numero de cuenta
         */
        if (mObjRow.Row == 2){
            // mStrNumCuenta = mObjRow.D.replaceAll('-', '').split(' ')[0];
            var mArrayRow2 = mObjRow.D.trim().split(' ');
            mStrNumCuenta = mArrayRow2[mArrayRow2.length - 1].replaceAll('-', '');
            // console.log('Cta:', mStrNumCuenta);
        }

        /**
         * Tipo de la divisa
         *  - Soles
         *  - Dólares
         *
         * Saldo de apertura
         */
        if (mObjRow.Row == 3){

            /**
             * Saldo de apertura
             */
            mFloatSaldoApertura = mObjRow.H;

            /**
             * Moneda de la Cta. Financiera
             */
            var mArrayRow3 = mObjRow.D.trim().split(' ');
            mStrMoneda = mArrayRow3[mArrayRow3.length - 1];
            mStrMoneda = mObjDivisa[mStrMoneda];

            // console.log('Moneda:', mStrMoneda);
            // console.log('Saldo Apertura:', mFloatSaldoApertura);

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

            // console.log(mArrayCbankPro);

            if(mArrayCbankPro.length == 0) {
                throw `No existe una cuenta financiera con BBAN [${mStrNumCuenta}] y Moneda [${mStrMoneda}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
            } else if(mArrayCbankPro.length > 1) {
                throw `Existe más de una cuenta financiera con BBAN [${mStrNumCuenta}] y Moneda [${mStrMoneda}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
            } else {
                mStrCodCtaFin    = mArrayCbankPro[0].ctafin;
                mStrCodBan       = mArrayCbankPro[0].codban;
                mFloatSaldoExtBanc = mArrayCbankPro[0].salext;
                mDateFecExtracto = mArrayCbankPro[0].fecext;
            }
        }

        /**
         * Control de apertura para fecha y saldo de extracto bancario
         */
        if (mObjRow.Row == 5) {

            mObjRow.B = mObjRow.B.replace(/\./g, '/');
            var mDateFechaInicio = new Ax.util.Date(mObjRow.B);
            mDateFechaInicio = mDateFechaInicio.addDay(-1);
            if(mDateFecExtracto == null) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}/${mFloatSaldoApertura}]`;}
            var mDateCbancproFecExtracto = new Ax.util.Date(mDateFecExtracto);

            if(!(mDateCbancproFecExtracto <= mDateFechaInicio)) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}/${mFloatSaldoApertura}]`;}
            if(mFloatSaldoApertura != mFloatSaldoExtBanc) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}/${mFloatSaldoApertura}]`;}
        }

        /**
         * Informacion de extractos del archivo excel
         */
        if (mObjRow.Row >= 5) {

            /**
             * Determinacion del importe del extracto
             */
            mFloatImportExt = mObjRow.G != null ? mObjRow.G : mObjRow.H;
            mFloatImportExt = parseFloat(mFloatImportExt);
            // console.log(typeof mFloatImportExt);

            __getValidarCampos(mObjRow);

            /**
             *  Validacion de concepto propio
             */
            mStrConcepPropio = __getConceptoPropio(mObjRow.F, mStrCodBan);
            // if(mStrConcepPropio == null) {
            //     throw `Concepto propio [${mObjRow.F}] no contemplado en [tconprop] para el código de banco [${mStrCodBan}].`;
            // }

            /**
             * Actualizacion de formato de fecha
             */
            mObjRow.B = mObjRow.B.replace(/\./g, '/');
            mObjRow.B = new Ax.util.Date(mObjRow.B);

            var mObjTextract = {
                file_seqno: pIntFileId,
                fecope: mObjRow.B,
                fecval: mObjRow.B,
                refer1: mObjRow.C,//
                import: mFloatImportExt,
                refer2: mObjRow.E,//
                docume: mObjRow.D,//
                ctafin: mStrCodCtaFin,
                empcode: '125',
                codban: mStrCodBan,
                ccc1: mStrNumCuenta.substring(0,3),
                ccc2: mStrNumCuenta.substring(3,6),
                ctacte: mStrNumCuenta.substring(6),
                concom: '00',
                // conpro: mStrConcepPropio,
                conpro: mObjRow.F,
                divisa: mStrMoneda
            }

            /**
             * Calculo del saldo de cierre
             */
            mDateFecExtCierre = mObjRow.B;
            mFloatSaldoCierre += mFloatImportExt;

            /**
             * Registro del extracto bancario
             */
            Ax.db.insert("textract", mObjTextract);
        }

    })
    mFloatSaldoCierre += parseFloat(mFloatSaldoApertura);
    console.log('Saldo Cierre', mFloatSaldoCierre);

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

crp_carga_extracto_bnacion(77);
// crp_carga_extracto_bnacion(71);