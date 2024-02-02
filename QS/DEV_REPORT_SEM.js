var fdata = {
    empcode: '125',
    ejerci: 2023,
    unidad: 1
}


let mTmpNumSemQS = Ax.db.getTempTableName('tmp_num_sem_qs');
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpNumSemQS}`);

Ax.db.execute(`
        CREATE TEMP TABLE ${mTmpNumSemQS} (
            num_mes     INTEGER,
            num_sem     INTEGER
        )          
    `);

for(var i = 1; i <= 12; i++){
    for(var j = 1; j <= 5; j++){
        Ax.db.insert(mTmpNumSemQS, { num_mes: i, num_sem: j });
    }
}



var mTmpCtaFin = Ax.db.getTempTableName(`tmp_cbancpro_x_sem`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCtaFin}`);
Ax.db.execute(`
    <select intotemp='${mTmpCtaFin}'>
        <columns>
            cbancpro.ctafin,
            cbancpro.nomcta,

            NVL(crp_calenda.nummes, ${mTmpNumSemQS}.num_mes) num_mes,
            NVL(crp_calenda.numsem, ${mTmpNumSemQS}.num_sem) num_sem,

            NVL(crp_calenda.semana, 'X') semana,
            crp_calenda.fecini,
            
            cbancpro.moneda,

            SUM(CASE WHEN taptcuen.fecope BETWEEN crp_calenda.fecini AND crp_calenda.fecfin
                        OR taptcuen.fecope &lt; crp_calenda.fecini THEN taptcuen.impcta
                    ELSE 0
            END) impflu

        </columns>
        <from table="taptcuen">
            <join type='inner' table="cbancpro">
                <on>taptcuen.empcode = cbancpro.empcode</on>
                <on>taptcuen.ctafin  = cbancpro.ctafin</on>
                <join type='inner' table="crp_tes_qs_ctafin">
                    <on>cbancpro.empcode = crp_tes_qs_ctafin.empcode</on>
                    <on>cbancpro.ctafin  = crp_tes_qs_ctafin.ctafin</on>
                </join>
            </join>
            <join table="${mTmpNumSemQS}">
                <join type='left' table='crp_tes_qs_calenda' alias='crp_calenda'>
                    <on>crp_calenda.nummes = ${mTmpNumSemQS}.num_mes</on>
                    <on>crp_calenda.numsem = ${mTmpNumSemQS}.num_sem</on>
                </join>
            </join>
            
        </from>
        <where>
            taptcuen.empcode          = ?
            AND crp_calenda.ejerci =  ?
            AND taptcuen.tipmov IN ('S','R')
            AND taptcuen.concid IS NOT NULL
            
            
            <!-- AND cbancpro.ctafin = 'BCPLCC9124'
            AND crp_calenda.semana = 'S49' -->
        </where>
        <group>1,2,3,4,5,6,7</group>
    </select>
`, fdata.empcode, fdata.ejerci);

var rs_data_2 = Ax.db.executeQuery(`
    <select>
        <columns>
            tmp_ctafin.ctafin,
            tmp_ctafin.nomcta,

            
            tmp_ctafin.semana,

            (CASE WHEN textract.fecope &lt; tmp_ctafin.fecini THEN tmp_ctafin.impflu + NVL(textract.import, 0)
                    ELSE tmp_ctafin.impflu
            END)*(NVL(qs_cambios.cambio, 1)/${fdata.unidad}) impflu

        </columns>
        <from table="${mTmpCtaFin}" alias='tmp_ctafin'>
            <join type='left' table="textract">
                <on>tmp_ctafin.ctafin = textract.ctafin</on>
                <on>textract.docume LIKE 'SALDO INIC%'</on>
            </join>
            <join type='left' table="crp_tes_qs_calenda" alias='crp_calenda_2'>
                <on>tmp_ctafin.semana = crp_calenda_2.semana</on>
                <on>tmp_ctafin.fecini = crp_calenda_2.fecini</on>

                <join type='left' table='crp_tes_qs_cambios' alias='qs_cambios'>
                    <on>crp_calenda_2.ejerci = qs_cambios.ejerci</on>
                    <on>crp_calenda_2.nummes = qs_cambios.period</on>
                    <on>crp_calenda_2.numsem = qs_cambios.numsem</on>
                </join>
            </join>
        </from>
        <order>
            1, 2, tmp_ctafin.num_mes, tmp_ctafin.num_sem
        </order>
    </select>
`).toMemory();

// return rs_data_2;

return rs_data_2.pivot(options => {
    options.setPivotColumnNames(['semana']);
    options.setMeasureColumnNames(['impflu']);
});