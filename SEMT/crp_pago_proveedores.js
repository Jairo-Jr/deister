/**
 *
 * @param pIntNumRemesa
 */
function crp_pago_proveedores(pIntNumRemesa) {

    // Variables de entrada
    var mIntNumrem = Ax.context.variable.NUMREM;
    // var mIntNumrem = pIntNumRemesa;

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

    // return mRsPagoProveedores;
    // Define el Blob
    var blob = new Ax.sql.Blob('pago.txt');

    // Definicion del archivo txt
    new Ax.rs.Writer(mRsPagoProveedores).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(blob);
    });

    // Definición de file zip
    var ficherozip  = new Ax.io.File("/tmp/ziptest.zip");
    var zip         = new Ax.util.zip.Zip(ficherozip);

    zip.zipFile(blob);
    zip.close();

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst     = new Ax.io.File(ficherozip.getAbsolutePath());
    var fichero = new Ax.sql.Blob(dst);

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    });
    mRsFile.rows().add(['pago.txt', fichero.getBytes()]);

    return mRsFile;

}