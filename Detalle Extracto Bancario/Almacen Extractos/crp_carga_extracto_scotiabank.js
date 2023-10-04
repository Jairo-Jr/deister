function crp_carga_extracto_scotiabank(pIntFileId) {

    function __getValidarCampos(pObjRowSheet) {
        console.log(pObjRowSheet);
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

    // console.log('Numero de filas', mIntNumRow);

    /**
     * Variables
     */
    var mStrNumCuenta = '';
    var mStrCodCtaFin = '';
    var mStrCodBan = '';
    var mStrMoneda = '';
    var mStrTipoCuenta = '';
    var mDateFecExtracto = '';
    var mFloatImporteExt = 0;
    var mFloatSaldoExt = 0;
    var mObjDivisa = {
        'Dólares': 'USD',
        'Soles': 'PEN'
    }
    console.log(mRsSheet);
    /**
     * Numerador de linea
     *  - 1: Numero de cuenta
     *  - 2: Divisa
     *  - 3: Tipo de cuenta
     *  - 6: Informacion para el extracto
     */
    var i = 1;
    mRsSheet.forEach(mRowSheet => {
        // console.log(mRowSheet);

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

        if (mRowSheet.Row >= 6) {

            __getValidarCampos(mRowSheet);
            /**
             * Validación de fecha y saldo del extracto
             */
            if(i == 1) {
                var mDateFechaInicio = new Ax.util.Date(mRowSheet.A);
                var mDateCbancproFecExtracto = new Ax.util.Date(mDateFecExtracto);

                if(mDateCbancproFecExtracto.afterOrEqual(mDateFechaInicio)) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}]`;}
                if(mRowSheet.E != mFloatImporteExt) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mRowSheet.E}]`;}
            }

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

            /**
             * Captura del ultimo registro para Fecha y Saldo del extracto
             */
            mFloatSaldoExt   = mRowSheet.E;
            mDateFecExtracto = mRowSheet.A;

            /**
             * Registro del extracto bancario
             */
            Ax.db.insert("textract", mObjTextract);
        }

    })

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
            salext : mFloatSaldoExt,
            fecext : mDateFecExtracto
        },
        {
            bban: mStrNumCuenta,
            moneda: mStrMoneda,
            estado: 'A',
            tipcta: 1
        }
    );
}


crp_carga_extracto_scotiabank(31);