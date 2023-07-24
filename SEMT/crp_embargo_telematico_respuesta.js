function crp_embargo_telematico_respuesta(p_fileid, pStrFileName) {

    var mArrPOBS = [];
    var mArrPAVS = [];

    try {
        Ax.db.beginWork();

        // Busqueda de archivo segun el fileId
        let mObjBlobData = Ax.db.executeQuery(`
            SELECT file_status, file_data, file_type, user_updated
            FROM crp_embargo_telematico_respuesta
            WHERE file_seqno = ?
        `, p_fileid).toOne();

        /**
         * Valida el estado del fichero
         */
        if(mObjBlobData.file_status != 'P') {
            throw 'Solo es permitido procesar ficheros en estado Pendiente.'
        }

        /**
         * SCRIPT PARA LEER ARCHIVOS CSV - TXT
         */
        var blob = new Ax.sql.Blob();
        blob.setContent(mObjBlobData.file_data);

        var mRsFichero = new Ax.rs.Reader().csv(options => {
            options.setBlob(blob);
            options.setDelimiter("|");
            options.setHeader(false);
            options.setQuoteChar(7);
            options.setCharset("ISO-8859-15");

            // Definición de tipo de datos a columnas
            // options.setColumnType("Numero de Comprobante",  Ax.sql.Types.CHAR);
            // options.setColumnType("Serie de Comprobante",  Ax.sql.Types.CHAR);

        })

        console.log(mRsFichero);

        /**
         * Efectos - Pagos
         */
        var mObjRemesas = Ax.db.executeQuery(`
            <select>
                <columns>
                    ctercero.cif,
                    cefectos.docser,
                    cefectos.numero
                </columns>
                <from table='cremesas'>
                    <join table='cefectos'>
                        <on>cremesas.numrem = cefectos.remesa</on>
                        <join type='left' table='ctercero'>
                            <on>cefectos.codper = ctercero.codigo</on>
                        </join>
                    </join>
                </from>
                <where>
                    cremesas.jusser = ?
                </where>
            </select>
        `, pStrFileName).toJSONArray();

        console.log(mObjRemesas);

        mRsFichero.forEach(mRowFile => {
            /**
             * Registro de respaldo de la data del fichero
             */
            // Ax.db.insert('crp_registro_semt', {
            //     file_seqno:     p_fileid,
            //     nmr_envio:      mRowFile['Column_0'],
            //     nmr_operacion:  mRowFile['Column_1'],
            //     ruc_crp:        mRowFile['Column_2'],
            //     ruc_tercer:     mRowFile['Column_3'],
            //     razon:          mRowFile['Column_4'],
            //     fec_registro:   mRowFile['Column_5'],
            //     monto_pagar:    parseFloat(mRowFile['Column_6']),
            //     estado_reg:     mRowFile['Column_7'],
            //     desc_estado:    mRowFile['Column_8'],
            //     res_coactiva:   mRowFile['Column_9']
            // });

            /**
             * Actualiza el numero de operacion
             */
            mObjRemesas.forEach(mObjRemesa => {

                if(mObjRemesa.cif == mRowFile['Column_3']){
                    // console.log('Remesa', mObjRemesa);

                    var resUpd = Ax.db.execute(`UPDATE cefectos SET auxnum1 = ${mRowFile['Column_1']}
                                    WHERE numero = ${mObjRemesa.numero} 
                                    AND auxnum1 IS NULL`);
                    // console.log('RES-UPD', resUpd);
                    /**
                     * Tiene deuda - Agrupa Gestion con esatdo POBS
                     */
                    if(resUpd.count == 1 && mRowFile['Column_7'] == 1) {
                        mArrPOBS.push(mObjRemesa.numero)
                    }

                    /**
                     * No tiene deuda - Agrupa Gestion con esatdo PAVS
                     */
                    if(resUpd.count == 1 && mRowFile['Column_7'] == 0) {
                        mArrPAVS.push(mObjRemesa.numero)
                    }
                }
            });

        });

        /**
         * Crea Gestion para POBS
         */
        console.log('POBS', mArrPOBS);

        /**
         * Crea Gestion para PAVS
         */
        console.log('PAVS', mArrPAVS);
        Ax.db.commitWork();
    } catch (error) {
        Ax.db.rollbackWork();

        console.error(error);

        // Ax.db.update(`crp_embargo_telematico_respuesta`,
        //     {
        //         file_status: 'E',
        //         file_memo: `${error.message || error}`
        //     }, {
        //         file_seqno: p_fileid
        //     }
        // );
    }


    // return p_fileid;
}

var p_fileid = 1;
var pStrFileName = 'RCP20230724004';
crp_embargo_telematico_respuesta(p_fileid, pStrFileName);