function crp_carga_extracto_interbank(pIntFileId) {


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
         * Conversion del fichero byte a string
         */
        var mFileTmp = Ax.io.File.createTempFile();
        mFileTmp.write(mFileBlobData);

        /**
         * readString() por sí solo genera error cuando el contenido no se encuentra
         * codificado con UTF-8, por lo que se especifica la codificación ISO-8859-1
         */
        var mArrText = mFileTmp.readString("ISO-8859-15").split(/\r\n|\n/);
        console.log(mFileTmp.readString("ISO-8859-15"));
        /**
         * Recorrido por lineas del archivo
         */
        mArrText.forEach(mStrRow => {

            /**
             * Limpieza de espacios en blanco ubicados a la izquierda
             */
            mStrRow = mStrRow.trimLeft();

            var mStrFecOpe = mStrRow.substring(144, 152); // Fecha de Operacion
            var mStrFecVal = mStrRow.substring(152, 160); // Fecha de Valor
            var mFloatImport1 = mStrRow.substring(76, 93).trim(); // Monto 1
            var mFloatImport2 = mStrRow.substring(93, 110).trim(); // Monto 2
            var mFloatMonto = mFloatImport1 ? mFloatImport1 : '-' + mFloatImport2;
            var mStrCtaFin = 'INBKCA7703';
            var mStrEmpCode = '125';
            var mStrCodBan = 'PE0003';
            var mStrNumCta = mStrRow.substring(7, 23).trim(); // Numero de Cuenta

            console.log(mStrNumCta);

            // var mObjTextract = {
            //     file_seqno: pIntFileId,
            //     fecope: mRowSheet.A,
            //     fecval: mRowSheet.B == null ? mRowSheet.A : mRowSheet.B,
            //     // refer1: mRowSheet.C,//
            //     import: mRowSheet.D,
            //     // refer2: mRowSheet.F,//
            //     // docume: mRowSheet.G,//
            //     ctafin: mStrCodCtaFin,
            //     empcode: '125',
            //     codban: mStrCodBan,
            //     ccc1: mStrNumCuenta.substring(0,3),
            //     ccc2: mStrNumCuenta.substring(3,6),
            //     ctacte: mStrNumCuenta.substring(6),
            //     concom: '00',
            //     conpro: mStrConcepPropio,
            //     divisa: mStrMoneda
            // }

            // /**
            //  * Registro del extracto bancario
            //  */
            // Ax.db.insert("textract", mObjTextract);


            // console.log(mStrRow);
        });


        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();

        throw new Ax.ext.Exception(error);
    }


}


crp_carga_extracto_interbank(42)