/**
 * Name: pe_sunat_ple03_2_rep
 */

    // ===============================================================
    // Tipo de reporte y año/mes del periodo informado.
    // =============================================================== 
var pStrCondicion   = 'I';
var mIntYear        = parseInt(2024);
var mIntMonth       = parseInt(1);

// ===============================================================
// Construcción de la primera y ultima fecha del mes,
// correspondiente al periodo informado
// ===============================================================
if(pStrCondicion == 'I') {
    var mDateTimeIniPeriodoInf = new Ax.util.Date('01-01-2024');
    var mDateTimeFinPeriodoInf = new Ax.util.Date('31-01-2024').addDay(1);
} else {
    var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth, 1);
    var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth + 1, 1);
}

// ===============================================================
// Concatenación del identificador del periodo para el
// reporte de SUNAT
// ===============================================================
var mStrCodPeriodo = mIntYear.toString() + (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth) + '00';

var mRsCapuntes = Ax.db.executeQuery(`
            <select >
                <columns>
                    capuntes.fecha                                                                              <alias name='period' />,                <!-- Campo 01 -->
                    capuntes.cuenta                                                                             <alias name='cod_cuenta' />,            <!-- Campo 02 -->
                    cbancdom.idriad                                                                             <alias name='cod_entid_financiera' />,  <!-- Campo 03 -->
                    cbancpro.bban                                                                               <alias name='num_cuenta' />,            <!-- Campo 04 -->
                    cempresa.divemp                                                                             <alias name='moneda' />,                <!-- Campo 05 -->
                    CASE WHEN SUM(capuntes.debe - capuntes.haber) &gt; 0 THEN SUM(capuntes.debe - capuntes.haber)
                    ELSE 0
                    END                                                                                        <alias name='sald_deudor' />,           <!-- Campo 06 -->
                    CASE WHEN SUM(capuntes.debe - capuntes.haber) &lt; 0 THEN SUM(capuntes.haber - capuntes.debe)
                    ELSE 0
                    END                                                                                        <alias name='sald_acreedor' />,         <!-- Campo 07 -->
                    '1'                                                                                         <alias name='estado_operacion' />,      <!-- Campo 08 -->
                    <whitespace/>
                </columns>
                <from table='capuntes'>
                    <join type='left' table='cbancpro'>
                        <on>capuntes.cuenta = cbancpro.cuenta</on>
                        <join type='left' table='cbancdom'>
                            <on>cbancpro.codban  = cbancdom.codban</on>
                        </join>
                    </join>
                    <join type="left" table="cempresa">
                        <on>capuntes.empcode = cempresa.empcode</on>
                    </join>
                </from>
                <where>
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'
                    AND capuntes.cuenta LIKE '10%'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                </where>
                <group>1,2,3,4,5</group>
            </select>
        `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

// ===============================================================
// Variables para el nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
var mStrMonth           = mIntMonth < 10 ? '0'+mIntMonth : mIntMonth;
var mIntIndOperacion    = 1;
var mIntContLibro       = 1;
var mIntMoneda          = 1;

// ===============================================================
// Estructura de nombre del archivo .txt de salida:
// LERRRRRRRRRRRAAAAMMDD030200CCOIM1.TXT
// ===============================================================
var mStrFileName = 'LE' + mStrRuc + mStrYear + mStrMonth + '0003020007'+ mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if (pStrCondicion == 'F') {

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var blob = new Ax.sql.Blob(mStrFileName);

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsCapuntes).csv(options => {
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
    mRsFile.rows().add([mStrFileName, fichero.getBytes()]);

    return mRsFile;

    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if (pStrCondicion == 'I') {
    return mRsCapuntes;
}
    