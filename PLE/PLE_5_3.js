// ===============================================================
// Tipo de reporte y periodo informado
// ===============================================================
var pStrCondicion = 'I';
var mIntEjercio = 2022;
var mIntPeriodo = 4;

var mDateTimeInicioP = new Ax.util.Date(mIntEjercio, mIntPeriodo, 1);
var mDateTimeFinP = new Ax.util.Date(mIntEjercio, mIntPeriodo + 1, 0, 23, 59, 59);

// var pStrCondicion = Ax.context.variable.TIPO;
// var mIntEjercio = Ax.context.variable.TIPO;
// var mIntPeriodo = Ax.context.variable.TIPO;

console.log(mDateTimeInicioP);
console.log(mDateTimeFinP);

var mRsPle5_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            ccuentas.date_created,
            '20220405' <alias name='campo1'/>,
            ccuentas.codigo <alias name='campo2'/>,
            ccuentas.nombre <alias name='campo3'/>,
            '04' <alias name='campo4'/>,
            '' <alias name='campo5'/>,
            '' <alias name='campo6'/>,
            '' <alias name='campo7'/>,

            <!-- COMPARAR DENTRO DEL MES -->
            CASE WHEN ccuentas.date_created &gt;= ? AND ccuentas.date_created &lt;= ?
                    THEN '1'
                    <!-- MENOR AL MES -->
                WHEN ccuentas.date_created &lt;= ?
                    THEN '8'
                ELSE '9'
            END <alias name='campo8'/>,
            <whitespace/>
        </columns>
        <from table='ccuentas'>
        </from>
        <where>
            1=1
            AND ccuentas.date_created &lt;= ?
        </where>
        <order>ccuentas.date_created DESC</order>
    </select>
`, mDateTimeInicioP, mDateTimeFinP, mDateTimeInicioP, mDateTimeFinP);

// Variables del nombre del archivo
var mStrRuc             = '20100121809';
var mStrYear            = '2023';
var mIntIndOperacion    = 1;
var mIntContLibro       = 1;
var mIntMoneda          = 1;

// Estructura de nombre del archivo txt de salida: LERRRRRRRRRRRAAAA000007030000OIM1.txt
var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007030000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

// Si la condición del reporte es Fichero (F)
if (pStrCondicion == 'F') { 

    // Definición del blob
    var blob = new Ax.sql.Blob(mStrNameFile);

    // Definición del archivo txt
    new Ax.rs.Writer(mRsPle5_3).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(blob);
    }); 

    // Definición de file zip
    var ficherozip = new Ax.io.File("/tmp/ziptest.zip");
    var zip = new Ax.util.zip.Zip(ficherozip); 

    zip.zipFile(blob);
    zip.close(); 

    // Definición blob del archivo zip
    var dst = new Ax.io.File(ficherozip.getAbsolutePath()); 
    var fichero = new Ax.sql.Blob(dst);

    // Definición ResultSet temporal
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    }); 
    mRsFile.rows().add([mStrNameFile, fichero.getBytes()]);

    return mRsFile;

    // Si la condición del reporte es Informe (I)
} else if (pStrCondicion == 'I') {
    return mRsPle5_3;
}