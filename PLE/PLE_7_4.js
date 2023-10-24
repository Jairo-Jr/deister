function PLE_7_4() {

    /**
     * Name: pe_sunat_ple07_4_rep
     */

    // ===============================================================
    // Tipo de reporte y año del periodo informado
    // ===============================================================
    var pStrCondicion   = Ax.context.variable.TIPO;
    var mIntYear        = Ax.context.variable.YEAR;


    // ===============================================================
    // RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 7.3
    // ===============================================================
    var mRsPle7_4 = Ax.db.executeQuery(` 
        <select>
            <columns>
                '20230000'                                          campo1,
                '00000000'                                          campo2,
                'A00000000'                                         campo3,
                '9'                                                 campo4,
                cfinconh.codfin                                     campo5,
                TO_CHAR(cfinconh.feccon, '%d/%m/%Y')                campo6,
                cfinconh.codfin                                     campo7,
                TO_CHAR(cfinconh.fecamo, '%d/%m/%Y')                campo8,
                cfinconh.numcuo                                     campo9,
                CAST(ROUND(cfinconh.valnet, 2) AS VARCHAR(15))      campo10,
                '1'                                                 campo11,
                <whitespace /> campo28
            </columns>
            <from table='cfinconh' />
            <where>
                YEAR(cfinconh.fecamo) = ?
            </where>
        </select>
    `, mIntYear);

    // ===============================================================
    // Variables del nombre del archivo
    // ===============================================================
    var mStrRuc             = '20100121809';
    var mStrYear            = mIntYear;
    var mIntIndOperacion    = 1;
    var mIntContLibro       = 1;
    var mIntMoneda          = 1;

    // ===============================================================
    // Estructura de nombre del archivo txt de salida:
    // LERRRRRRRRRRRAAAA000007040000OIM1.TXT
    // ===============================================================
    var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007040000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

    // ===============================================================
    // Si la condición del reporte es Fichero (F)
    // ===============================================================
    if (pStrCondicion == 'F') {

        // ===============================================================
        // Definición del blob
        // ===============================================================
        var blob = new Ax.sql.Blob(mStrNameFile);

        // ===============================================================
        // Definición del archivo txt
        // ===============================================================
        new Ax.rs.Writer(mRsPle7_4).csv(options => {
            options.setHeader(false);
            options.setDelimiter("|");
            options.setResource(blob);
        });

        // ===============================================================
        // Definición de file zip
        // ===============================================================
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
        mRsFile.rows().add([mStrNameFile, fichero.getBytes()]);

        return mRsFile;

        // ===============================================================
        // Si la condición del reporte es Informe (I)
        // ===============================================================
    } else if (pStrCondicion == 'I') {
        return mRsPle7_4;
    }
}