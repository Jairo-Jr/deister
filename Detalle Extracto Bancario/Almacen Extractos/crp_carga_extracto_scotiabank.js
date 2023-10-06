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
    mXlsSheet.removeRow(0);
    var mIntNumRow = mXlsSheet.getLastRowNum();
    // console.log(mXlsSheet.getRow(149));
    var mRsSheet = mXlsSheet.toResultSet();
    // console.log(mRsSheet);

    /**
     * Variables
     */
    var mStrNumCuenta = '1912634606190';
    var mStrCodCtaFin = 'SCTBCA6886';
    var mStrCodBan = 'PE0009';
    var mStrMoneda = 'PEN';
    var mStrTipoCuenta = '';
    var mDateFecExtracto = '';
    var mFloatImporteExt = 0;
    var mFloatSaldoExt = 0;
    var mObjDivisa = {
        'Dólares': 'USD',
        'Soles': 'PEN'
    }
    /**
     * Equivalencia para conceptos propios
     */
    var mObjConcepPropio = {
        '0101': '00002',
        '0909': '00003',
        '2004': '00004',
        '4406': '00175',
        '4981': '01549',
        '4991': '01579',
        '4921': '00086',
        '4903': ''
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
        console.log(mRowSheet);

        var mObjTextract = {
            file_seqno: pIntFileId,
            fecope: mRowSheet.A,
            fecval: mRowSheet.A,
            refer1: mRowSheet.F,//
            import: mRowSheet.E,
            // refer2: mRowSheet.F,
            docume: mRowSheet.D,//
            ctafin: mStrCodCtaFin, // Pendiente
            empcode: '125',
            codban: mStrCodBan, // Pendiente
            ccc1: mStrNumCuenta.substring(0,3), // Pendiente
            ccc2: mStrNumCuenta.substring(3,6), // Pendiente
            ctacte: mStrNumCuenta.substring(6), // Pendiente
            concom: '00',
            conpro: mRowSheet.C,
            divisa: mStrMoneda // Pendiente
        }
        i++;

        /**
         * Captura del ultimo registro para Fecha y Saldo del extracto
         */
        // mFloatSaldoExt   = mRowSheet.E;
        // mDateFecExtracto = mRowSheet.A;

        /**
         * Registro del extracto bancario
         */
        Ax.db.insert("textract", mObjTextract);

        /**
         * Numero de cuenta
         */
        // if (mRowSheet.Row == 1){
        //     mStrNumCuenta = mRowSheet.B.replaceAll('-', '').split(' ')[0];

        // }

        /**
         * Tipo de la divisa
         *  - Soles
         *  - Dólares
         */
        // if (mRowSheet.Row == 2){
        //     mStrMoneda = mObjDivisa[mRowSheet.B];

        //     if(mStrMoneda == undefined ) {
        //         throw `Tipo de moneda no contemplado, solo [Soles - Dólares]`;
        //     }

        //     var mArrayCbankPro = Ax.db.executeQuery(`
        //         <select>
        //             <columns>
        //                 ctafin, codban, salext, fecext
        //             </columns>
        //             <from table='cbancpro'/>
        //             <where>
        //                 bban = ?
        //                 AND moneda = ?
        //                 AND estado = 'A'
        //                 AND tipcta = 1
        //             </where>
        //         </select>
        //     `, mStrNumCuenta, mStrMoneda).toJSONArray();

        //     if(mArrayCbankPro.length == 0) {
        //         throw `No existe una cuenta financiera con BBAN [${mStrNumCuenta}] y Moneda [${mStrMoneda}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
        //     } else if(mArrayCbankPro.length > 1) {
        //         throw `Existe más de una cuenta financiera con BBAN [${mStrNumCuenta}] y Moneda [${mStrMoneda}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
        //     } else {
        //         mStrCodCtaFin    = mArrayCbankPro[0].ctafin;
        //         mStrCodBan       = mArrayCbankPro[0].codban;
        //         mFloatImporteExt = mArrayCbankPro[0].salext;
        //         mDateFecExtracto = mArrayCbankPro[0].fecext;
        //     }
        // }
        // if (mRowSheet.Row == 3){
        //     mStrTipoCuenta = mRowSheet.B;
        // }

        // if (mRowSheet.Row >= 6) {

        //     __getValidarCampos(mRowSheet);
        //     /**
        //      * Validación de fecha y saldo del extracto
        //      */
        //     if(i == 1) {
        //         var mDateFechaInicio = new Ax.util.Date(mRowSheet.A);
        //         var mDateCbancproFecExtracto = new Ax.util.Date(mDateFecExtracto);

        //         if(mDateCbancproFecExtracto.afterOrEqual(mDateFechaInicio)) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}]`;}
        //         if(mRowSheet.E != mFloatImporteExt) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mRowSheet.E}]`;}
        //     }

        //     /**
        //      *  Validacion de concepto propio
        //      */
        //     var mStrConcepPropio = mObjConcepPropio[mRowSheet.J];
        //     if(mStrConcepPropio == undefined ) {
        //         throw `Equivalencia del concepto propio [${mRowSheet.J}] no contemplado.`;
        //     }

        //     var mObjTextract = {
        //         file_seqno: pIntFileId,
        //         fecope: mRowSheet.A,
        //         fecval: mRowSheet.B == null ? mRowSheet.A : mRowSheet.B,
        //         refer1: mRowSheet.C,//
        //         import: mRowSheet.D,
        //         refer2: mRowSheet.F,//
        //         docume: mRowSheet.G,//
        //         ctafin: mStrCodCtaFin,
        //         empcode: '125',
        //         codban: mStrCodBan,
        //         ccc1: mStrNumCuenta.substring(0,3),
        //         ccc2: mStrNumCuenta.substring(3,6),
        //         ctacte: mStrNumCuenta.substring(6),
        //         concom: '00',
        //         conpro: mStrConcepPropio,
        //         divisa: mStrMoneda
        //     }
        //     i++;

        //     /**
        //      * Captura del ultimo registro para Fecha y Saldo del extracto
        //      */
        //     mFloatSaldoExt   = mRowSheet.E;
        //     mDateFecExtracto = mRowSheet.A;

        //     /**
        //      * Registro del extracto bancario
        //      */
        //     // Ax.db.insert("textract", mObjTextract);
        // }

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


crp_carga_extracto_scotiabank(40);