// ===============================================================
// Tipo de reporte y año/mes del periodo informado
// =============================================================== 
var pStrCondicion = Ax.context.variable.TIPO;
var mIntEjercio = Ax.context.variable.TIPO;
var mIntPeriodo = Ax.context.variable.TIPO; 

// ===============================================================
// Construcción de la primera y ultima fecha del mes, 
// correspondiente al periodo informado
// ===============================================================
var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntEjercio, mIntPeriodo, 1);
var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntEjercio, mIntPeriodo + 1, 0, 23, 59, 59); 

// ===============================================================
// Concatenación del identificador del periodo para el 
// reporte de SUNAT
// ===============================================================
var mStrCodPeriodo = mIntEjercio.toString() + (mIntPeriodo < 10 ? '0'+mIntPeriodo : mIntPeriodo) + '00'; 

// ===============================================================
// Definición del periodo actual
// ===============================================================
var mDateToday = new Ax.util.Date(); 
var mYearToday = mDateToday.getYear();
var mMonthToday = mDateToday.getMonth() + 1; 

// ===============================================================
// Construcción de la primera y ultima fecha del mes, correspondiente al periodo actual.
// ===============================================================
var mDateTimeIniPeriodoAct = new Ax.util.Date(mYearToday, mMonthToday, 1);
var mDateTimeFinPeriodoAct = new Ax.util.Date(mYearToday, mMonthToday + 1, 0, 23, 59, 59); 

// ===============================================================
// Generación del ResultSet para el PLE
// ===============================================================
var mRsPle5_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            CAST('${mStrCodPeriodo}' AS VARCHAR(8)) <alias name='campo1'/>,

            CAST(ccuentas.codigo AS VARCHAR(24)) <alias name='campo2'/>,

            CAST(ccuentas.nombre AS VARCHAR(100)) <alias name='campo3'/>,

            CAST('04' AS VARCHAR(2)) <alias name='campo4'/>,

            '' <alias name='campo5'/>,
            '' <alias name='campo6'/>,
            '' <alias name='campo7'/>,

            <!-- COMPARAR DENTRO DEL MES -->
            CASE WHEN ccuentas.date_created &gt;= ? AND ccuentas.date_created &lt;= ?
                    THEN '1'
                    <!-- MENOR AL MES -->
                WHEN ccuentas.date_created &lt; ?
                    THEN '8'
                ELSE '9'
            END <alias name='campo8'/>,
            <whitespace/>
        </columns>
        <from table='ccuentas'>
        </from>
        <where>
            1=1
            AND ccuentas.date_created BETWEEN ? AND ?
        </where>
        <order>ccuentas.date_created DESC</order>
    </select>
`, mDateTimeIniPeriodoAct, mDateTimeFinPeriodoAct, mDateTimeIniPeriodoAct, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf); 

// ===============================================================
// Variables del nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntEjercio;
var mStrMonth           = (mIntPeriodo < 10 ? '0'+mIntPeriodo : mIntPeriodo);
var mIntIndOperacionO   = 1;
var mIntContLibroI      = 1;
var mIntMonedaM         = 1; 

// ===============================================================
// Estructura de nombre del archivo txt de salida: 
// LERRRRRRRRRRRAAAAMM0005030000OIM1.TXT
// ===============================================================
var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007030000' + mIntIndOperacionO + mIntContLibroI + mIntMonedaM + '1.txt'; 

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
    new Ax.rs.Writer(mRsPle5_3).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(blob);
    }); 

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var ficherozip = new Ax.io.File("/tmp/ziptest.zip");
    var zip = new Ax.util.zip.Zip(ficherozip); 

    zip.zipFile(blob);
    zip.close(); 

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst = new Ax.io.File(ficherozip.getAbsolutePath()); 
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
    return mRsPle5_3;
}