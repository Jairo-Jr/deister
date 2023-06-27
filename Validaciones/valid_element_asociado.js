/**
 * bloqueo: w26260
 * */

function crp_retorno_detraccion_file(p_fileid) {
    var mBoolBloquea = true;
    var mRsGcomfacl = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomfach.empcode,
                    gcomfacl.linid, *
                </columns>
                <from table='gcomfach'>
                    <join table='gcomfacl'>
                        <on>gcomfach.cabid = gcomfacl.cabid</on>
                    </join>
                </from>
                <where>
                    gcomfach.tipdoc IN ('FINV')
                    AND gcomfach.cabid = 21225
                </where>
            </select>
    `).toJSONArray();

    mRsGcomfacl.forEach(mLine => {

    });

}


crp_retorno_detraccion_file(10);



/*

<select>
    <columns>
        *
    </columns>
    <from table='gcomfacl_datc'>
        <join table='cpar_parpreh'>
            <on>gcomfacl_datc.codpre = cpar_parpreh.codpre</on>
            <join table='cpar_parprel'>
                <on>cpar_parpreh.empcode = cpar_parprel.empcode</on>
                <on>cpar_parpreh.codpre = cpar_parprel.codpre</on>
                <on>gcomfacl_datc.codpar = cpar_parprel.codpar</on>
                <!-- <join table='crp_relation_elemen_datc'>
                    <on>gcomfacl_datc.linid = crp_relation_elemen_datc.linid</on>
                </join> -->
            </join>
        </join>
    </from>
    <where>
        cpar_parprel.auxnum1 = 2
        AND cpar_parpreh.empcode = '125'
        AND gcomfacl_datc.linid = 49304
    </where>
</select>




* */