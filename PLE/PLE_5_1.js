/**
 * Name: pe_sunat_ple05_1_rep
 */

// ===============================================================
// Tipo de reporte y año/mes del periodo informado.
// =============================================================== 
var pStrCondicion   = Ax.context.variable.TIPO;
var mIntYear        = Ax.context.variable.YEAR;
var mIntMonth       = Ax.context.variable.MONTH;

// ===============================================================
// Construcción de la primera y ultima fecha del mes, 
// correspondiente al periodo informado
// ===============================================================
var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth, 1);
var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth + 1, 0);

// ===============================================================
// Concatenación del identificador del periodo para el 
// reporte de SUNAT
// ===============================================================
var mStrCodPeriodo = mIntYear.toString() + (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth) + '00';

// ===============================================================
// Definición del periodo actual
// ===============================================================
var mDateToday  = new Ax.util.Date();
var mYearToday  = mDateToday.getYear();
var mMonthToday = mDateToday.getMonth() + 1;

// ===============================================================
// Construcción de la primera y ultima fecha del mes, 
// correspondiente al periodo actual.
// ===============================================================
var mDateTimeIniPeriodoAct = new Ax.util.Date(mYearToday, mMonthToday, 1);
var mDateTimeFinPeriodoAct = new Ax.util.Date(mYearToday, mMonthToday + 1, 0); 

// ===============================================================
// TABLA TEMPORAL PARA CARTERA DE EFECTOS
// ===============================================================
let mTmpTableCefectos = Ax.db.getTempTableName(`@tmp_tbl_cefectos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCefectos}`);

Ax.db.execute(`
    <select intotemp='@tmp_tbl_cefectos'>º
        <columns>
            capuntes.apteid,
            MAX(cefectos.fecven) fecven
        </columns>
        <from table='capuntes'>
            <join type='left' table='cefectos'>
                <on>capuntes.apteid = cefectos.apteid</on>
            </join>
        </from>
        <where>
            <!-- capuntes.fecha BETWEEN '01-04-2023' AND '09-04-2023' -->
            capuntes.fecha BETWEEN ? AND ?
        </where>
        <group>1</group>
    </select>
`, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

// ===============================================================
// RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 5.1
// ===============================================================

/**
 * TODO:
 *  Hasta que se determine, de forma temporal se esta manejando asi:
 *  - Lo definido en el campo 21 compara el periodo informado (lo establecido como data de entrada) 
 *    con el periodo actual (determinado por la fecha de hoy), si ambos coinciden se establece '1',
 *    si el periodo informado es menor se establece como '8' y en otro caso se establece como '9'
 */
var mRsPle_5_1 = Ax.db.executeQuery(`
    <select>
        <columns>
            CAST('${mStrCodPeriodo}' AS VARCHAR(8))         <alias name='campo1' />,
            CAST('CUO20230400' AS VARCHAR(40))              <alias name='campo2' />,
            CAST('MCUO20230400' AS VARCHAR(10))             <alias name='campo3' />,
            CAST(capuntes.cuenta AS VARCHAR(24))            <alias name='campo4' />,
            CAST(capuntes.proyec AS VARCHAR(24))            <alias name='campo5' />,
            CAST(capuntes.seccio AS VARCHAR(24))            <alias name='campo6' />,
            CAST(capuntes.moneda AS VARCHAR(3))             <alias name='campo7' />,
            CAST('' AS VARCHAR(1))                          <alias name='campo8' />,
            CAST(ctax_move_head.taxh_cifter AS VARCHAR(15)) <alias name='campo9' />,
            CAST(ctax_move_head.taxh_auxchr4 AS VARCHAR(2)) <alias name='campo10' />,
            CAST(
                SUBSTR(ctax_move_head.taxh_refter, 1, CHARINDEX('-', ctax_move_head.taxh_refter)-1)
                AS VARCHAR(20)
            )                                               <alias name='campo11' />,
            CAST(
                SUBSTR(ctax_move_head.taxh_refter, CHARINDEX('-', ctax_move_head.taxh_refter)+1)
                AS VARCHAR(20)
            )                                               <alias name='campo12' />,
            TO_CHAR(capuntes.fecha, '%d/%m/%Y')             <alias name='campo13' />,
            TO_CHAR(tmp_cefectos.fecven, '%d/%m/%Y')        <alias name='campo14' />,
            TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y') <alias name='campo15' />,
            CAST(capuntes.concep AS VARCHAR(200))           <alias name='campo16' />,
            ''                                              <alias name='campo17' />,
            CAST(ROUND(capuntes.debe, 2) AS VARCHAR(15))    <alias name='campo18' />,
            CAST(ROUND(capuntes.haber, 2) AS VARCHAR(15))   <alias name='campo19' />,

            ''                                              <alias name='campo20' />,
            CASE WHEN capuntes.fecha BETWEEN ? AND ?
                    THEN '1'
                WHEN capuntes.fecha &lt; ?
                    THEN '8'
                ELSE '9'
            END                                             <alias name='campo21' />,
            <whitespace/>
        </columns>
        <from table='capuntes'>
            <join table='@tmp_tbl_cefectos' alias='tmp_cefectos'>
                <on>capuntes.apteid = tmp_cefectos.apteid</on>
            </join>

            <join table='ctax_move_head'>
                <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
            </join>
        </from>
        <where>
            ctax_move_head.taxh_fecdoc &lt;= ?
        </where>
    </select>
`, mDateTimeIniPeriodoAct, mDateTimeFinPeriodoAct, mDateTimeIniPeriodoAct, mDateTimeFinPeriodoInf);

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
// LERRRRRRRRRRRAAAAMM0005010000OIM1.txt
// ===============================================================
var mStrFileName = 'LE' + mStrRuc + mStrYear + mStrMonth + '0005010000'+ mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if(pStrCondicion == 'F') {

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var blob = new Ax.sql.Blob(mStrFileName);

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsPle_5_1).csv(options => {
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
    mRsFile.rows().add([mStrFileName, fichero.getBytes()]);

    return mRsFile; 

    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if(pStrCondicion == 'I') {
    return mRsPle_5_1;
}
