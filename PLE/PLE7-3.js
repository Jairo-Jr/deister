var pStrCondicion = 'I';
var mIntYear = 2023;
// var pStrCondicion = Ax.context.variable.TIPO;
// var mIntYear = Ax.context.variable.YEAR;

// Obtencion del tipo de cambio
var mDecTipoCambio = Ax.db.executeGet(`
    <select first='1'>
        <columns>
            ccambios.camcom
        </columns>
        <from table='ccambios'/>
        <where>
            tipcam = 'D' 
            AND monori = 'PEN' 
            AND moneda = 'USD' 
            AND fecha = '31-12-${mIntYear}'
        </where>
    </select>
`);

/* TABLA TEMPORAL PARA OBTENER LOS CAMPOS 14 */
let mTmpTable3 = Ax.db.getTempTableName(`tmp_cinmcomp_depreciacion_otros`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable3}`);

var resSQL = Ax.db.execute(`
    <select intotemp='${mTmpTable3}' >
        <columns>
            cinmelem.empcode, 
            cinmelem.codinm, 
            cinmelem.codele,
            SUM(cinmamor.import) import_3

        </columns>
        <from table='cinmelem'>
            <join table='cinmcomp'>
                <on>cinmelem.empcode = cinmcomp.empcode</on>
                <on>cinmelem.codinm = cinmcomp.codinm</on>
                <on>cinmelem.codele = cinmcomp.codele</on>

                <join table='cinmhead'>
                    <on>cinmcomp.empcode = cinmhead.empcode</on>
                    <on>cinmcomp.codinm  = cinmhead.codinm</on>
                </join>

                <join type='left' table='cinmamor'>
                    <on>cinmcomp.empcode = cinmamor.empcode</on>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                </join>

            </join>
        </from>
        <where>
            cinmhead.estcom = 'A'
            AND cinmcomp.tipcom NOT IN ('I', 'A')
            AND cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
        </where>
        <group>1, 2, 3</group>
    </select>
`);

/* TABLA TEMPORAL PARA OBTENER LOS CAMPOS 13 */
let mTmpTable2 = Ax.db.getTempTableName(`tmp_cinmcomp_depreciacion_baja_activo`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable2}`);

Ax.db.execute(`
    <select intotemp='${mTmpTable2}' >
        <columns>
            cinmelem.empcode, 
            cinmelem.codinm, 
            cinmelem.codele,
            SUM(cinmamor.import) import_2
        </columns>
        <from table='cinmelem'>
            <join table='cinmcomp'>
                <on>cinmelem.empcode = cinmcomp.empcode</on>
                <on>cinmelem.codinm = cinmcomp.codinm</on>
                <on>cinmelem.codele = cinmcomp.codele</on>

                <join type='left' table='cinmamor'>
                    <on>cinmcomp.empcode = cinmamor.empcode</on>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                </join>

            </join>
        </from>
        <where>
            cinmcomp.fecbaj IS NOT NULL
            AND cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
        </where>
        <group>1, 2, 3</group>
    </select>
`);

/* TABLA TEMPORAL PARA OBTENER LOS CAMPOS 6 Y 12 */
let mTmpTable1 = Ax.db.getTempTableName(`tmp_cinmcomp_fecha_y_depreciacion`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable1}`);

Ax.db.execute(`
    <select intotemp='${mTmpTable1}' >
        <columns>
            cinmelem.empcode, 
            cinmelem.codinm, 
            cinmelem.codele, 
            MAX(cinmcomp.fecfac) fecfac,
            SUM(cinmamor.import) import,
            SUM(cinmamor.import) import,
            SUM(cinmamor.import) import

        </columns>
        <from table='cinmelem'>
            <join table='cinmcomp'>
                <on>cinmelem.empcode = cinmcomp.empcode</on>
                <on>cinmelem.codinm = cinmcomp.codinm</on>
                <on>cinmelem.codele = cinmcomp.codele</on>

                <join table='cinmhead'>
                    <on>cinmcomp.empcode = cinmhead.empcode</on>
                    <on>cinmcomp.codinm  = cinmhead.codinm</on>
                </join>

                <join type='left' table='cinmamor'>
                    <on>cinmcomp.empcode = cinmamor.empcode</on>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                </join>

            </join>
        </from>
        <where>
            cinmhead.estcom = 'A'
            AND cinmcomp.tipcom IN ('I', 'A')
            AND cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
        </where>
        <group>1, 2, 3</group>
    </select>
`);

var mRsPle7_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            '${mIntYear}0000'   <alias name='campo1' />,
            'CUO0001'           <alias name='campo2' />,
            'MCUO0001'          <alias name='campo3' />,
            9                   <alias name='campo4' />,
            cinmelem.codele     <alias name='campo5' />,
            TO_CHAR(${mTmpTable1}.fecfac, '%d/%m/%Y')        <alias name='campo6' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15))             <alias name='campo7' />,
            CAST(ROUND(0.00, 3) AS VARCHAR(5))              <alias name='campo8' />,
            CAST(ROUND(cinmeval.iniele, 2) AS VARCHAR(15))                          <alias name='campo9' />,
            NVL( CAST(ROUND(${mDecTipoCambio}, 3) AS VARCHAR(5)) , '0.000')         <alias name='campo10' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15))     <alias name='campo11' />,
            NVL( CAST(ROUND(${mTmpTable1}.import, 2) AS VARCHAR(15)) , '0.00')      <alias name='campo12' />,
            NVL( CAST(ROUND(${mTmpTable2}.import_2, 2) AS VARCHAR(15)) , '0.00')    <alias name='campo13' />,
            NVL( CAST(ROUND(${mTmpTable3}.import_3, 2) AS VARCHAR(15)) , '0.00')    <alias name='campo14' />,
            1   <alias name='campo15' />,
            <whitespace/>
        </columns>
        <from table='cinmelem'>
            <join type='left' table='${mTmpTable1}'>
                <on>cinmelem.empcode = ${mTmpTable1}.empcode</on>
                <on>cinmelem.codinm  = ${mTmpTable1}.codinm</on>
                <on>cinmelem.codele  = ${mTmpTable1}.codele</on>
            </join>
            <join type='left' table='${mTmpTable2}'>
                <on>cinmelem.empcode = ${mTmpTable2}.empcode</on>
                <on>cinmelem.codinm  = ${mTmpTable2}.codinm</on>
                <on>cinmelem.codele  = ${mTmpTable2}.codele</on>
            </join>
            <join type='left' table='${mTmpTable3}'>
                <on>cinmelem.empcode = ${mTmpTable3}.empcode</on>
                <on>cinmelem.codinm  = ${mTmpTable3}.codinm</on>
                <on>cinmelem.codele  = ${mTmpTable3}.codele</on>
            </join>
            <join table='cinmeval'>
                <on>cinmelem.empcode = cinmeval.empcode</on>
                <on>cinmelem.codinm  = cinmeval.codinm</on>
                <on>cinmelem.codele  = cinmeval.codele</on>
            </join>
        </from>
        <where>
            1=1
        </where>
    </select>
`);

// var mRsPle7_3 = Ax.db.executeQuery(` 
//     <select>
//         <columns>
//             '${mIntYear}0000'   <alias name='campo1' />,
//             'CUO0001'           <alias name='campo2' />,
//             'MCUO0001'          <alias name='campo3' />,
//             9                   <alias name='campo4' />,
//             cinmelem.codele     <alias name='campo5' />,
//             TO_CHAR(${mTmpTable1}.fecfac, '%d/%m/%Y')        <alias name='campo6' />,
//             CAST(ROUND(0.00, 2) AS VARCHAR(15))             <alias name='campo7' />,
//             CAST(ROUND(0.00, 3) AS VARCHAR(5))              <alias name='campo8' />,
//             CAST(ROUND(cinmeval.iniele, 2) AS VARCHAR(15))                          <alias name='campo9' />,
//             NVL( CAST(ROUND(${mDecTipoCambio}, 3) AS VARCHAR(5)) , '0.000')         <alias name='campo10' />,
//             CAST(ROUND(0.00, 2) AS VARCHAR(15))     <alias name='campo11' />,
//             NVL( CAST(ROUND(${mTmpTable1}.import, 2) AS VARCHAR(15)) , '0.00')      <alias name='campo12' />,
//             NVL( CAST(ROUND(${mTmpTable2}.import_2, 2) AS VARCHAR(15)) , '0.00')    <alias name='campo13' />,
//             NVL( CAST(ROUND(${mTmpTable3}.import_3, 2) AS VARCHAR(15)) , '0.00')    <alias name='campo14' />,
//             1   <alias name='campo15' />,
//             <whitespace/>
//         </columns>
//         <from table='cinmelem'>
//             <join type='left' table='${mTmpTable1}'>
//                 <on>cinmelem.empcode = ${mTmpTable1}.empcode</on>
//                 <on>cinmelem.codinm  = ${mTmpTable1}.codinm</on>
//                 <on>cinmelem.codele  = ${mTmpTable1}.codele</on>
//             </join>
//             <join type='left' table='${mTmpTable2}'>
//                 <on>cinmelem.empcode = ${mTmpTable2}.empcode</on>
//                 <on>cinmelem.codinm  = ${mTmpTable2}.codinm</on>
//                 <on>cinmelem.codele  = ${mTmpTable2}.codele</on>
//             </join>
//             <join type='left' table='${mTmpTable3}'>
//                 <on>cinmelem.empcode = ${mTmpTable3}.empcode</on>
//                 <on>cinmelem.codinm  = ${mTmpTable3}.codinm</on>
//                 <on>cinmelem.codele  = ${mTmpTable3}.codele</on>
//             </join>
//             <join table='cinmeval'>
//                 <on>cinmelem.empcode = cinmeval.empcode</on>
//                 <on>cinmelem.codinm  = cinmeval.codinm</on>
//                 <on>cinmelem.codele  = cinmeval.codele</on>
//             </join>
//         </from>
//         <where>
//             1=1
//         </where>
//     </select>
// `);

return mRsPle7_3;

// Variables del nombre del archivo
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
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
    new Ax.rs.Writer(mRsPle7_3).csv(options => {
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
    return mRsPle7_3;
}
