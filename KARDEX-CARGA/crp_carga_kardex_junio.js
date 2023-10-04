function crp_carga_kardex_junio() {

    var data = Ax.db.executeGet(
        `SELECT load_exc_data FROM cxls_apuntes_load WHERE seqno = 4`
    );

    var mIntRow = 1;
    var campo1 = '';
    var campo2 = '';
    var mObjProcLog = require("clogproh");
    Ax.db.beginWork();
    mObjProcLog.start('carga_kardex_junio_excel', null, 0);
    Ax.db.commitWork();

    var mIntLogId = mObjProcLog.getLogId();
    try {
        // Ax.db.beginWork();



        var wb = Ax.ms.Excel.load(data);
        var mXlsSheet = wb.getSheet(0);
        mXlsSheet.packRows();
        var mRsSheet = mXlsSheet.toResultSet();
        // console.log(mRsSheet);
        /**
         *   Update line discounts. Head discounts are update when all
         *	 lines have been processed.
         */
        var batchTabdtll = Ax.db.updateBatch('crp_kardex');

        for (var mRowGcomdtll of mRsSheet) {

            if (mRowGcomdtll.A != null && mRowGcomdtll.A != '-'){
                // console.log(mRowGcomdtll);
                var campo1= mRowGcomdtll.A.split('-')[0];
                var campo2= mRowGcomdtll.A.split('-')[1];
                // console.log(mRowGcomdtll.A.split('-')[0]);
                // console.log(mRowGcomdtll.A.split('-')[1]);

                //var mCount = Ax.db.executeGet(`SELECT COUNT(*) FROM crp_kardex WHERE (nro_asiento_declarado !='${campo2}' OR asien_ch !='${campo2}') AND numero = '${campo1}' AND periodo = '20230600';`);

                //if (mCount > 0){
                // Ax.db.execute(`UPDATE crp_kardex SET nro_asiento_declarado = '${campo2}' , asien_ch = '${campo2}' WHERE numero = '${campo1}' AND periodo =  '20230600';`);
                batchTabdtll.addBatch(
                    {"nro_asiento_declarado" : campo2,
                        "asien_ch" : campo2
                    },
                    {"numero"  : campo1,
                        "periodo"  : "20230600"}
                );
                mObjProcLog.log(null, null, null, null, campo1, campo2, mIntRow, 1);

                //}

                mIntRow++;
            }


        }
        batchTabdtll.close();



        /**
         * Notificar en el log de procesos.
         */
        mObjProcLog.log(null, null, null, null, null, null, mIntRow, 1);

        // Ax.db.commitWork();
    } catch (error) {
        // Ax.db.rollbackWork();

        /**
         * Guardar el error en el log de procesos
         */
        mObjProcLog.err(error, error.message, null, null, null, mIntRow);
    }




    mObjProcLog.end();

    // return rowsUpdated;
}
