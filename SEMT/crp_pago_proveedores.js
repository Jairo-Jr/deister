/**
 * Obj Reporte: crp_pago_proveedores
 * @param pIntNumRemesa
 */
function crp_pago_proveedores(pIntNumRemesa) {
    function __getNumCorrelativo(pStrLocalDate) {

        // Numero de registros existentes
        var mIntNumRegistros = Ax.db.executeGet(`
            <select>
                <columns>
                    COUNT(*)
                </columns>
                <from table='csopmagn'/>
                <where>
                    file_proc = 'crp_pago_proveedores'
                    AND date_created BETWEEN '${pStrLocalDate} 00:00:00' AND '${pStrLocalDate} 23:59:59'
                </where>
            </select>
        `);
        var mIntCorrelativo = mIntNumRegistros + 1;
        console.log('Cantidad Reg:', mIntCorrelativo);
        if(mIntCorrelativo > 999) {
            throw 'Limite alcanzado por archivos generados, [999]';
        }

        const mStrCodigo = mIntCorrelativo.toString();
        const mStrCodRelleno = '0'.repeat(3 - mStrCodigo.length);
        const cadenaCompletada = mStrCodRelleno.concat(mStrCodigo);

        return cadenaCompletada;
    }

    // Variables de entrada
    var mIntNumrem = Ax.context.variable.NUMREM;
    // var mIntNumrem = pIntNumRemesa;

    var date = new Ax.util.Date().toLocalDate();
    var mStrLocalDate = date.toString();
    var mArrayDate = date.toString().split('-');

    var mStrYear  = mArrayDate[0];
    var mStrMonth = mArrayDate[1];
    var mStrDay   = mArrayDate[2];

    // Obtencion de pagos a proveedores
    var mRsPagoProveedores = Ax.db.executeQuery(`
            <select>
                <columns>
                    ctercero.cif,
                    SUM(cefectos.import) import
                </columns>
                <from table='cefectos'>
                    <join type='left' table='ctercero'>
                        <on>cefectos.codper = ctercero.codigo</on>
                    </join>         
                </from>
                <where>
                    cefectos.remesa  = ${mIntNumrem}
                </where>
                <group>
                    1
                </group>
            </select>
    `);

    // Generación del correlativo
    var mStrCorrelativo = __getNumCorrelativo(mStrLocalDate);

    console.log('Correlativo:', mStrCorrelativo);

    // Variables para Repositorio de Soportes Magnéticos
    var mStrFileProc = 'crp_pago_proveedores';
    var mStrFileName = 'RCP' + mStrYear + mStrMonth + mStrDay + mStrCorrelativo;
    var mStrFileMemo = "PAGO PROVEEDORES - SEMT";
    var mStrFileArgs = 'Numero remesa.: ' + mIntNumrem;
    var mStrFileType = 'application/zip';
    var mIntFileSize = 0;
    var mStrFileMd5;
    var mBlobFileData;

    // Define el Blob
    var blob = new Ax.sql.Blob(mStrFileName + '.txt');

    // Definicion del archivo txt
    new Ax.rs.Writer(mRsPagoProveedores).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(blob);
    });

    // Definición del archivo zip
    var ficherozip  = new Ax.io.File("/tmp/ziptest.zip");
    var zip         = new Ax.util.zip.Zip(ficherozip);

    zip.zipFile(blob);
    zip.close();

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst     = new Ax.io.File(ficherozip.getAbsolutePath());
    var fichero = new Ax.sql.Blob(dst);

    // Registro en Repositorio de soportes magnéticos (csopmagn).
    mIntFileSize = fichero.length();

    var digest = new Ax.crypt.Digest("MD5");
    mStrFileMd5 = digest.update(fichero).digest();

    mBlobFileData = fichero;

    // Elimina registros existentes con el mismo MD5
    Ax.db.execute(`DELETE FROM csopmagn WHERE file_md5 = ?`, mStrFileMd5);

    // Define objeto para csopmagn
    var csopmagn = {
        file_proc: mStrFileProc,
        file_name: mStrFileName + '.zip',
        file_memo: mStrFileMemo,
        file_args: mStrFileArgs,
        file_type: mStrFileType,
        file_size: mIntFileSize,
        file_md5: mStrFileMd5,
        file_data: mBlobFileData,
        user_created: Ax.db.getUser(),
        date_created: new Ax.util.Date(),
        user_updated: Ax.db.getUser(),
        date_updated: new Ax.util.Date()
    }

    var mIntImgid = Ax.db.insert('csopmagn', csopmagn).getSerial();

    return Ax.db.executeQuery(`
        <select>
           <columns>
                *
            </columns>
           <from table='csopmagn' />
           <where>
                file_seqno = ?
            </where>
        </select>
    `, mIntImgid);

}