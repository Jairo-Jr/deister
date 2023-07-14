/**
 *
 * @param pIntNumRemesa
 */
function crp_pago_proveedores(pIntNumRemesa) {

    // Variables de entrada
    var mIntNumrem = Ax.context.variable.NUMREM;

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

    // Variables para Repositorio de Soportes Magnéticos
    var mStrFileProc = 'crp_pago_proveedores';
    var mStrFileName = 'pago';
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

