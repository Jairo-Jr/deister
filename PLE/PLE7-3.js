var pStrCondicion = Ax.context.variable.TIPO;
var mIntYear = Ax.context.variable.YEAR; 

var mRsPle7_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            '${mIntYear}0000' <alias name='campo1' />,
            'CUO0001' <alias name='campo2' />,
            'MCUO0001' <alias name='campo3' />,
            9 <alias name='campo4' />,
            cinmelem.codele <alias name='campo5' />,
            TO_CHAR((SELECT MAX(fecfac) FROM cinmcomp WHERE cinmcomp.codele = cinmelem.codele), '%d/%m/%Y')  <alias name='campo6' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) <alias name='campo7' />,
            CAST(ROUND(0.00, 3) AS VARCHAR(5)) <alias name='campo8' />,
            CAST(ROUND(cinmeval.iniele, 2) AS VARCHAR(15)) <alias name='campo9' />,
            CAST(ROUND(0.00, 3) AS VARCHAR(5)) <alias name='campo10' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) <alias name='campo11' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) <alias name='campo12' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) <alias name='campo13' />,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) <alias name='campo14' />,
            1 <alias name='campo15' />,
            <whitespace/>
        </columns>
        <from table='cinmelem'>
            <join table='cinmeval'>
                <on>cinmelem.codele = cinmeval.codele</on>
            </join>
        </from>
        <where>
            1=1
            <!-- AND cinmelem.codele = '001014284' -->
        </where>
    </select>
`); 

var mStrRuc = '20100121809';
var mStrYear = mIntYear; // mIntYear
var mIntIndOperacion = 1;
var mIntContLibro = 1;
var mIntMoneda = 1;

var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007030000' + mIntIndOperacion + mIntContLibro + mIntMoneda +'1.txt';

if (pStrCondicion == 'F') { 
    var blob = new Ax.sql.Blob(mStrNameFile);
    new Ax.rs.Writer(mRsPle7_3).csv(options => { 
        options.setHeader(false); 
        options.setDelimiter("|"); 
        options.setResource(blob);
    }); 

    // Agregar temporal en memoria 

    var mRsFile = new Ax.rs.Reader().memory(options => {
    	options.setColumnNames([ "nombre", "archivo" ]);
    	options.setColumnTypes([ Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]); 
    });

    mRsFile.rows().add([mStrNameFile, blob.getBytes()]);
    return mRsFile;

} else if (pStrCondicion == 'I') {
    return mRsPle7_3;
}