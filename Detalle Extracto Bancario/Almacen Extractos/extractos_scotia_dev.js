function crp_carga_extracto_scotia(pIntFileId) {

    /**
     * Definicion de variables
     */
    var mObjDivisa = {
        'S/': 'PEN',
        '$': 'USD'
    }
    var mStrCodCtaFin = '';
    var mStrCodBan = '';
    var mFloatImporteExt = '';
    var mDateFecExtracto = '';
    var mFloatSaldoExt = 0;
    var mStrNumCta = '';
    var mFloatSaldoApertura = 0;
    var mStrDivisa = '';

    try {
        Ax.db.beginWork();


        /**
         * Captura del archivo Excel
         */
        let mFileBlobData = Ax.db.executeGet(`
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
        var wb = Ax.ms.Excel.load(mFileBlobData);
        var mXlsSheet = wb.getSheet(0);
        mXlsSheet.packRows();
        var mIntNumRow = mXlsSheet.getLastRowNum();
        var mRsSheet = mXlsSheet.toResultSet();

        console.log(mRsSheet);

        /**
         * Conversion del fichero byte a string
         */
        // var mFileTmp = Ax.io.File.createTempFile();
        // mFileTmp.write(mFileBlobData);

        /**
         * readString() por sí solo genera error cuando el contenido no se encuentra
         * codificado con UTF-8, por lo que se especifica la codificación ISO-8859-1
         *
         *  - Se omitio la codificación por tildes en el archivo
         */
        // var mArrText = mFileTmp.readString();
        // mArrText = mArrText.replace(/\n$/, "");

        // mArrText = mArrText.split(/\r\n|\n/);

        /**
         * Recorrido por lineas del archivo
         */
        var i=0;
        mRsSheet.forEach(mObjRow => {

            /**
             * Construccion de datos
             */
            if(mObjRow.Row == 4) {
                /**
                 * Numero de cuenta
                 */
                var mArrayColA = mObjRow["A"].trim().split(' ');
                mStrNumCta = mArrayColA.pop().replace('-', '');
            }

            if(mObjRow.Row == 5) {
                /**
                 * Divisa y Saldo de apertura
                 */
                var mArrayColA = mObjRow["A"].trim().split(' ');
                mFloatSaldoApertura = mArrayColA.pop();
                mStrDivisa = mObjDivisa[mArrayColA.pop()];
                console.log(mArrayColA);
                console.log(mFloatSaldoApertura, mStrDivisa);
            }

            // var mStrFecOpe = mObjRow.substring(16, 24); // Fecha de Operacion
            //     mStrFecOpe = mStrFecOpe.substring(6, 8) + '/' + mStrFecOpe.substring(4, 6) + '/' + mStrFecOpe.substring(0, 4); // Formato de fecha (DD/MM/YYYY)
            // var mStrFecVal = mObjRow.substring(140, 148); // Fecha de Valor

            //     mStrFecVal = mStrFecVal.substring(6, 8) + '/' + mStrFecVal.substring(4, 6) + '/' + mStrFecVal.substring(0, 4); // Formato de fecha (DD/MM/YYYY)
            // var mFloatImport = mObjRow.substring(45, 60).trim(); // Importe
            //     mFloatImport = parseFloat(mFloatImport);
            // var mStrSigno = mObjRow.substring(60, 61).trim(); // Signo
            //     mFloatImport = mStrSigno + mFloatImport; // Concatena signo + importe

            //     mFloatImport = mFloatImport * -1; // Cambio de signo

            // var mStrConPro = mObjRow.substring(32, 35); // Concepto Propio
            // // var mFloatSaldo = mObjRow.substring(110, 127).trim(); // Saldo

            // var mStrRefer2 = mObjRow.substring(148).trim() // Referencia 2
            // var mStrConcep = mObjRow.substring(83, 114).trim() // Descripción

            // /**
            //  * Validación en la primera fila de:
            //  *  - Codigo de cuenta financiera
            //  *  - Fecha del extracto
            //  *  - Saldo del extracto
            //  */
            // if (i == 0){

            //     mStrNumCta = mObjRow.substring(4, 14); // Numero de Cuenta
            //     mStrDivisa = mObjDivisa[mObjRow.substring(125, 127)]; // Divisa

            //     var mArrayCbancPro = Ax.db.executeQuery(`
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
            //     `, mStrNumCta, mStrDivisa).toJSONArray();

            //     if(mArrayCbancPro.length == 0) {
            //         throw `No existe una cuenta financiera con BBAN [${mStrNumCta}] y Moneda [${mStrDivisa}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
            //     } else if(mArrayCbancPro.length > 1) {
            //         throw `Existe más de una cuenta financiera con BBAN [${mStrNumCta}] y Moneda [${mStrDivisa}], en Estado [Abierta] y Tipo [Cuenta corriente]`;
            //     } else {
            //         mStrCodCtaFin    = mArrayCbancPro[0].ctafin;
            //         mStrCodBan       = mArrayCbancPro[0].codban;
            //         // mFloatImporteExt = mArrayCbancPro[0].salext;
            //         // mDateFecExtracto = mArrayCbancPro[0].fecext;
            //     }

            //     /**
            //      * Validación de fecha y saldo del extracto
            //      */
            //     // var mDateFechaInicio = new Ax.util.Date(mStrFecOpe);
            //     // if(mDateFecExtracto == null) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}]`;}
            //     // var mDateCbancproFecExtracto = new Ax.util.Date(mDateFecExtracto);

            //     // if(mDateCbancproFecExtracto.afterOrEqual(mDateFechaInicio)) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en fecha de extracto :[${mDateFechaInicio.format("dd-MM-yyyy")}]`;}
            //     // if(mFloatSaldo != mFloatImporteExt) {throw `Cta: [${mStrCodCtaFin}] - Inconsistencia en saldo de extracto :[${mFloatSaldo}]`;}

            // }

            // var mObjTextract = {
            //     file_seqno: pIntFileId,
            //     fecope: mStrFecOpe,
            //     fecval: mStrFecVal,
            //     // refer1: mStrRefer1,//
            //     import: mFloatImport,
            //     refer2: mStrRefer2,//
            //     // docume: mRowSheet.G,//
            //     concep: mStrConcep,
            //     ctafin: mStrCodCtaFin,
            //     empcode: '125',
            //     codban: mStrCodBan,
            //     ccc1: mStrNumCta.substring(0,3),
            //     ccc2: mStrNumCta.substring(3,6),
            //     ctacte: mStrNumCta.substring(6),
            //     concom: '00',
            //     conpro: mStrConPro,
            //     divisa: mStrDivisa
            // }
            // i++
            /**
             * Captura del ultimo registro para Fecha y Saldo del extracto
             */
            // mFloatSaldoExt   = mFloatSaldo;
            // mDateFecExtracto = mStrFecOpe;

            /**
             * Registro del extracto bancario
             */
            // Ax.db.insert("textract", mObjTextract);
        });

        /**
         * Se actualiza el estado del almacen de fichero (textract_file)
         */
        // Ax.db.update("textract_file",
        //     {
        //         file_estado : 1
        //     },
        //     {
        //         file_seqno : pIntFileId
        //     }
        // );

        /**
         * Se actualiza el saldo y fecha de la cuenta financiera (cbancpro)
         */
        // Ax.db.update("cbancpro",
        //     {
        //         salext : mFloatSaldoExt,
        //         fecext : mDateFecExtracto
        //     },
        //     {
        //         bban: mStrNumCta,
        //         moneda: mStrDivisa,
        //         estado: 'A',
        //         tipcta: 1
        //     }
        // );

        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();

        throw new Ax.ext.Exception(error);
    }


}

crp_carga_extracto_scotia(20)