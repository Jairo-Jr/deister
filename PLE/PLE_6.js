/**
 * Name: pe_sunat_ple06_rep
 */

// ===============================================================
// Tipo de reporte y año/mes del periodo informado
// =============================================================== 
var mStrCondicion   = 'F';
var mIntYear   = 2022;
var mIntMonth     = 4;
// var mStrCondicion   = Ax.context.variable.TIPO;
// var mIntYear   = Ax.context.variable.YEAR;
// var mIntMonth     = Ax.context.variable.MONTH;

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
// TABLA TEMPORAL PARA CARTERA DE EFECTOS
// ===============================================================
let mTmpTableCefectos = Ax.db.getTempTableName(`@tmp_tbl_cefectos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCefectos}`);

Ax.db.execute(`
    <select intotemp='${mTmpTableCefectos}'>
        <columns>
            capuntes.apteid, 
            MAX(cefectos.fecven) fecven 
        </columns>
        <from table='capuntes'>
            <join type='left' table="cefectos">
                <on>capuntes.apteid = cefectos.apteid</on>
            </join>
        </from>
        <where>
            capuntes.fecha   BETWEEN ? AND ?
        </where>
        <group>1</group> 
    </select>
`, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

var numerroer = 0;
// ===============================================================
// Generación del ResultSet para el PLE
// ===============================================================
var mRsPle5_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            CAST('${mStrCodPeriodo}' AS VARCHAR(8))                 <alias name='campo1' />,
            CAST('CUO'||capuntes.apteid AS VARCHAR(40))             <alias name='campo2' />,
            CAST('MCUO${mStrCodPeriodo}' AS VARCHAR(10))            <alias name='campo3' />,

            CASE WHEN CHARINDEX('.', csaldos.cuenta) &gt; 0
                 THEN SUBSTR(csaldos.cuenta, 1, CHARINDEX('.', csaldos.cuenta)-1) || SUBSTR(csaldos.cuenta, CHARINDEX('.', csaldos.cuenta)+1)
                ELSE csaldos.cuenta
            END                                                 <alias name='campo4'/>,
                
            csaldos.proyec                                      <alias name='campo5'/>,
            csaldos.seccio                                      <alias name='campo6'/>,
            csaldos.moneda                                      <alias name='campo7'/>,

            CASE WHEN NVL(ctax_move_head.taxh_cifter, '0') = '0' THEN ''
                ELSE '6'
            END <alias name='campo8'/>,
                
            ctax_move_head.taxh_cifter <alias name='campo9'/>,

            <!-- Test -->
            NVL(ctax_move_head.taxh_auxchr4, '00')      <alias name='campo10'/>,

            <!-- CAST(ctax_move_head.taxh_auxchr4 AS VARCHAR(2)) <alias name='campo10'/>, -->

            SUBSTR(ctax_move_head.taxh_refter, 1, CHARINDEX('-', ctax_move_head.taxh_refter)-1)     <alias name='campo11' />,

            <!-- Test -->
            CASE WHEN NVL(ctax_move_head.taxh_refter, '0') = '0'  THEN 'NC00123'
                ELSE SUBSTR(ctax_move_head.taxh_refter, CHARINDEX('-', ctax_move_head.taxh_refter)+1)
            END <alias name='campo12' />,
            <!-- CAST(
                SUBSTR(ctax_move_head.taxh_refter, CHARINDEX('-', ctax_move_head.taxh_refter)+1)
                AS VARCHAR(20)
            )                                                       <alias name='campo12' />, -->
            

            TO_CHAR(capuntes.fecha, '%d/%m/%Y')        <alias name='campo13' />,

            TO_CHAR(tmp_cefectos.fecven, '%d/%m/%Y')        <alias name='campo14' />,

            <!-- Temporal -->
            CASE WHEN NVL(ctax_move_head.taxh_fecdoc, 0) = 0 THEN '28/02/2022'
                ELSE TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y')
            END <alias name='campo15' />,
            <!-- CAST(TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y') AS VARCHAR(10) )        <alias name='campo15' />, -->

            <!-- Temporal -->
            CASE WHEN NVL(capuntes.concep, '0') = '0' THEN ('Glosa para autocompletar las faltantes')
                WHEN CHARINDEX('|°', capuntes.concep) &gt; 0 THEN REPLACE(capuntes.concep, '|°', '1°')
                WHEN CHARINDEX('|', capuntes.concep) &gt; 0 THEN REPLACE(capuntes.concep, '|', '')
                ELSE (capuntes.concep)
            END <alias name='campo16' />,

            <!-- CAST(capuntes.concep AS VARCHAR(200))                   <alias name='campo16' />, -->

            ''                                                      <alias name='campo17' />,

            NVL(capuntes.debe, 0)                               <alias name='campo18' />,
            <!-- CAST(ROUND(capuntes.debe, 2) AS VARCHAR(15))            <alias name='campo18' />, -->

            NVL(capuntes.haber, 0) <alias name='campo19' />,
            <!-- CAST(ROUND(capuntes.haber, 2) AS VARCHAR(15))           <alias name='campo19' />, -->

            ''                                                      <alias name='campo20' />,
            '1'                                                      <alias name='campo21' />,
            
            <whitespace/>
        </columns>
        <from table='csaldos'>
            <join type='left' table="capuntes">

                <on>csaldos.empcode = capuntes.empcode</on>
                <on>csaldos.cuenta  = capuntes.cuenta</on>
                <on>csaldos.codaux  = NVL(capuntes.codaux, 0)</on>
                <on>csaldos.ctaaux  = NVL(capuntes.ctaaux, 0)</on>
                <on>csaldos.moneda  = capuntes.moneda</on>
                <on>csaldos.proyec  = capuntes.proyec</on>
                <on>csaldos.seccio  = capuntes.seccio</on>
                <on>csaldos.sistem  = capuntes.sistem</on>
                <on>capuntes.fecha   BETWEEN ? AND ?</on>

                <join table='@tmp_tbl_cefectos' alias='tmp_cefectos'>
                    <on> capuntes.apteid = tmp_cefectos.apteid</on>
                </join>

                <join type='left' table="ctax_move_head">
                    <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
                </join>

            </join>
        </from>
        <where>
            csaldos.ejerci = ?
            AND csaldos.period = ?
        </where> 
    </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mIntYear, mIntMonth).toMemory();

var mArrayCodCuentas = [];

// mRsPle5_3.forEach(item => {
//     if(item.campo2.length < 3){
//         mArrayCodCuentas.push(item.campo2);
//     }
// });



// ===============================================================
// Variables del nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
var mStrMonth           = (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth);
var mIntIndOperacionO   = 1;
var mIntContLibroI      = 1;
var mIntMonedaM         = 1; 

// ===============================================================
// Estructura de nombre del archivo txt de salida: 
// LE RRRRRRRRRRR AAAA MM 0006010000OIM1.TXT
// ===============================================================

// LE                  RRRRRRRRRRR    AAAA         MM       0006010000           O                  I              M          1.txt
var mStrNameFile = 'LE' + mStrRuc + mStrYear + mStrMonth + '0006010000' + mIntIndOperacionO + mIntContLibroI + mIntMonedaM + '1.txt'; 

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if (mStrCondicion == 'F') { 
    if (mArrayCodCuentas.length > 0) {
        throw new Ax.ext.Exception(`El/los códigos de Cuentas Contables, deben tener entre 3 y 24 dígitos: [${mArrayCodCuentas}]`);
    }

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