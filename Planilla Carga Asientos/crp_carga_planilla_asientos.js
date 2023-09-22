function crp_carga_planilla_asientos(pIntFileId) {

    /**
     * Obtención de la data del fichero según su identificador.
     */
    var mFileData = Ax.db.executeGet(` 
        <select>
            <columns>
                cxls_apuntes_master.master_data
            </columns>
            <from table='cxls_apuntes_master'/>
            <where>
                cxls_apuntes_master.master_seqno  = ?
            </where>
        </select>
    `, pIntFileId);

    try {
        Ax.db.beginWork();

        /**
         * Workbook
         */
        var wb = Ax.ms.Excel.load(mFileData);
        var mXlsSheet = wb.getSheet(0);
        mXlsSheet.packRows();
        mXlsSheet.removeRow(0);
        var mRsSheet = mXlsSheet.toResultSet();



        /**
         * Recorrido de la informacion del archivo
         */
        mRsSheet.forEach(mRowSheet => {
            /**
             * Se realiza la inserción a la tabla de respaldo.
             */
            console.log(mRowSheet);

        });

        Ax.db.commitWork();
    } catch (e) {
        Ax.db.rollbackWork();

        console.error("Error:", e);
    }
}