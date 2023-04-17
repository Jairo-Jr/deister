/**
 * Name: pe_sunat_ple05_3_rep
 */

// ===============================================================
// Tipo de reporte y año/mes del periodo informado
// =============================================================== 
// var mStrCondicion   = 'I';
// var mIntEjercicio   = 2022;
// var mIntPeriodo     = 5;
var mStrCondicion   = Ax.context.variable.TIPO;
var mIntEjercicio   = Ax.context.variable.YEAR;
var mIntPeriodo     = Ax.context.variable.MONTH;

// ===============================================================
// Construcción de la primera y ultima fecha del mes, 
// correspondiente al periodo informado
// ===============================================================
var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntEjercicio, mIntPeriodo, 1);
var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntEjercicio, mIntPeriodo + 1, 0, 23, 59, 59);

var numerroer = 0;
// ===============================================================
// Generación del ResultSet para el PLE
// ===============================================================
var mRsPle5_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            CAST(TO_CHAR(ccuentas.date_created, '%Y%m%d') AS VARCHAR(8)) <alias name='campo1'/>,
            
            CASE WHEN CHARINDEX('.', ccuentas.codigo) &gt; 0
                    THEN SUBSTR(ccuentas.codigo, 1, CHARINDEX('.', ccuentas.codigo)-1) || SUBSTR(ccuentas.codigo, CHARINDEX('.', ccuentas.codigo)+1)
                ELSE ccuentas.codigo
            END <alias name='campo2'/>,

            CAST(ccuentas.nombre AS VARCHAR(100)) <alias name='campo3'/>,

            CAST('04' AS VARCHAR(2)) <alias name='campo4'/>,

            '' <alias name='campo5'/>,
            '' <alias name='campo6'/>,
            '' <alias name='campo7'/>,
            '1' <alias name='campo8'/>,
            <whitespace/>
        </columns>
        <from table='ccuentas'>
        </from>
        <where>
            1=1
            AND ccuentas.codigo IS NOT NULL
            AND ccuentas.date_created &gt;= ? AND ccuentas.date_created &lt;= ?
        </where>
        <order>ccuentas.date_created DESC</order>
    </select>
`, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf).toMemory();

var mArrayCodCuentas = [];

mRsPle5_3.forEach(item => {
   if(item.campo2.length < 8){
       mArrayCodCuentas.push(item.campo2);
    }
});

if (mArrayCodCuentas) {
    throw new Ax.ext.Exception(`El/los códigos de Cuentas Contables, deben tener entre 3 y 24 dígitos: [${mArrayCodCuentas}]`);
} else {
    console.log('Sin errores');
}

// ===============================================================
// Variables del nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntEjercicio;
var mStrMonth           = (mIntPeriodo < 10 ? '0'+mIntPeriodo : mIntPeriodo);
var mIntIndOperacionO   = 1;
var mIntContLibroI      = 1;
var mIntMonedaM         = 1; 

// ===============================================================
// Estructura de nombre del archivo txt de salida: 
// LERRRRRRRRRRRAAAAMM0005030000OIM1.TXT
// ===============================================================

// LE                  RRRRRRRRRRR    AAAA         MM       0005030000           O                  I              M          1.txt
var mStrNameFile = 'LE' + mStrRuc + mStrYear + mStrMonth + '0005030000' + mIntIndOperacionO + mIntContLibroI + mIntMonedaM + '1.txt'; 

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if (mStrCondicion == 'F') { 

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var mBlob = new Ax.sql.Blob(mStrNameFile); 

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsPle5_3).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(mBlob);
    }); 

    mRsPle5_3.close();

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var mFicheroZip  = new Ax.io.File("/tmp/ziptest.zip");
    var mZip         = new Ax.util.zip.Zip(mFicheroZip); 

    mZip.zipFile(mBlob);
    mZip.close(); 

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var mDestino    = new Ax.io.File(mFicheroZip.getAbsolutePath()); 
    var mFichero    = new Ax.sql.Blob(mDestino); 

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    }); 
    mRsFile.rows().add([mStrNameFile, mFichero.getBytes()]);

    return mRsFile; 
    
    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if (mStrCondicion == 'I') {
    return mRsPle5_3;
}