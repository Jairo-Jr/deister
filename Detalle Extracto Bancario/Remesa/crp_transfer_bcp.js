function crp_transfer_bcp() {

    /**
     * VARIABLES DE ENTRADA
     */
        // var mIntNumrem = Ax.context.variable.NUMREM;
        // var mStrJusser = Ax.context.variable.JUSSER;
        // var mFloatCambio = Ax.context.variable.CAMBIO;

    var mIntNumrem = 113;
    // var mStrJusser = pStrDocumento;

    /**
     * LOCAL FUNCTION: __getEstructuraCabecera
     *
     * Description:
     *
     * PARAMETERS:
     *      @param  {string}       pStrCadena              Identificador de fichero
     *      @param  {string}       pStrCaracter              Identificador de fichero
     *      @param  {string}       pStrOrden              Identificador de fichero
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
     *      @param  {integer}       pIntNumRemesa              Identificador de fichero
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

        console.log(mIntCantAbono, mIntCantAbono.length);
        console.log(mStrFecRegistro, mStrFecRegistro.length);
        console.log(mStrTipCuenta, mStrTipCuenta.length);
        console.log(mStrMoneda, mStrMoneda.length);
        console.log(mStrNumCuentaCargo, mStrNumCuentaCargo.length);

    }

    __getEstructuraCabecera(mIntNumrem);

    // Obtencion de pagos a proveedores
    //     var mRsTemp  = Ax.db.executeQuery(`<select>
    //     <columns>
    //         ctercero.cif,
    //         cefectos.impdiv,
    //         cefectos.moneda,
    //         cefectos.fecha,
    //         cefecges_pcs.pcs_fecpro
    //     </columns>
    //     <from table='cefectos'>
    //         <join type='left' table='ctercero'>
    //             <on>cefectos.codper = ctercero.codigo</on>
    //         </join>
    //         <join table='cefecges_pcs'>
    //             <on>cefectos.remesa = cefecges_pcs.pcs_numrem</on>
    //         </join>
    //     </from>
    //     <where>
    //         cefectos.remesa  = ${mIntNumrem}
    //     </where>
    // </select>`)

    //     var mFloatAcum = 0

    //     var mRsPagoProveedores = new Ax.rs.Reader().memory(options => {
    //         options.setColumnNames([ "cif", "import" ]);
    //         options.setColumnTypes([ Ax.sql.Types.CHAR, Ax.sql.Types.DOUBLE]);
    //     });

    //     // mRsTemp.cursor()
    //     //     .group('cif')
    //     //     .after(row => {
    //     //         mRsPagoProveedores.rows().add([row.cif, mFloatAcum.toFixed(2)]);
    //     //         mFloatAcum = 0;
    //     //     })
    //     //     .forEach(row=>{
    //     //         var cambioReal = row.moneda != 'PEN'
    //     //             ? mFloatCambio
    //     //             : 1
    //     //         mFloatAcum = mFloatAcum + (row.impdiv * cambioReal)
    //     //     })



    // // Variables para Repositorio de Soportes Magnéticos
    //     var mStrFileProc = 'crp_embargo_telematico';
    //     var mStrFileName = 'pagos';
    //     var mStrFileMemo = "PAGO PROVEEDORES - SEMT";
    //     var mStrFileArgs = 'Numero remesa..: ' + mIntNumrem + '\n' +
    //         'Documento......: ' + mStrJusser;
    //     var mStrFileType = 'application/zip';
    //     var mIntFileSize = 0;
    //     var mStrFileMd5;
    //     var mBlobFileData;

    // // Define el Blob
    //     var blob = new Ax.sql.Blob(mStrFileName + '.txt');

    // // Definicion del archivo txt
    //     new Ax.rs.Writer(mRsPagoProveedores).csv(options => {
    //         options.setHeader(false);
    //         options.setDelimiter("|");
    //         options.setResource(blob);
    //     });

    // // Definición del archivo zip
    //     var ficherozip  = new Ax.io.File("/tmp/ziptest.zip");
    //     var zip         = new Ax.util.zip.Zip(ficherozip);

    //     zip.zipFile(blob);
    //     zip.close();

    // // ===============================================================
    // // Definición blob del archivo zip
    // // ===============================================================
    //     var dst     = new Ax.io.File(ficherozip.getAbsolutePath());
    //     var fichero = new Ax.sql.Blob(dst);

    // // Registro en Repositorio de soportes magnéticos (csopmagn).
    //     mIntFileSize = fichero.length();

    //     var digest = new Ax.crypt.Digest("MD5");
    //     mStrFileMd5 = digest.update(fichero).digest();

    //     mBlobFileData = fichero;

    // // Elimina registros existentes con el mismo MD5
    //     Ax.db.execute(`DELETE FROM csopmagn WHERE file_md5 = ?`, mStrFileMd5);

    // // Define objeto para csopmagn
    //     var csopmagn = {
    //         file_proc: mStrFileProc,
    //         file_name: mStrFileName + '.zip',
    //         file_memo: mStrFileMemo,
    //         file_args: mStrFileArgs,
    //         file_type: mStrFileType,
    //         file_size: mIntFileSize,
    //         file_md5: mStrFileMd5,
    //         file_data: mBlobFileData,
    //         user_created: Ax.db.getUser(),
    //         date_created: new Ax.util.Date(),
    //         user_updated: Ax.db.getUser(),
    //         date_updated: new Ax.util.Date()
    //     }

    //     var mIntImgid = Ax.db.insert('csopmagn', csopmagn).getSerial();

    //     return Ax.db.executeQuery(`
    //     <select>
    //         <columns>
    //             *
    //         </columns>
    //         <from table='csopmagn' />
    //         <where>
    //             file_seqno = ?
    //         </where>
    //     </select>
    // `, mIntImgid);
}

crp_transfer_bcp();