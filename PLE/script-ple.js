var rs = Ax.db.executeQuery(`
    <select>
        <columns>
            '20220000' cmp1,
            'CUO0001' cmp2,
            'MCUO0001' cmp3,
            9 cmp4,
            cinmelem.codele cmp5,
            TO_CHAR((SELECT MAX(fecfac) FROM cinmcomp WHERE cinmcomp.codele = cinmelem.codele), '%d/%m/%Y')  cmp6,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) cmp7,
            CAST(ROUND(0.00, 3) AS VARCHAR(5)) cmp8,
            CAST(ROUND(cinmeval.iniele, 2) AS VARCHAR(15)) cmp9,
            CAST(ROUND(0.00, 3) AS VARCHAR(5)) cmp10,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) cmp11,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) cmp12,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) cmp13,
            CAST(ROUND(0.00, 2) AS VARCHAR(15)) cmp14,
            1 cmp15,
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

// return rs;

// LERRRRRRRRRRRAAAA000007030000OIM1.TXT
// LE2010012180920210000070100001111.txt

var ruc = '20100121809';
var year = 2022;
var O = 1;
var I = 1;
var M = 1;

var name = 'LE' + ruc + year + '000007030000' + O + I + M +'1.txt';
    
var blob = new Ax.sql.Blob(name);
new Ax.rs.Writer(rs).csv(options => {
    


    options.setHeader(false);

    options.setDelimiter("|");

    options.setResource(blob);


    // Wire logger to console logger to see writer debug
    options.setLogger(console.getLogger()); 
});
return blob;