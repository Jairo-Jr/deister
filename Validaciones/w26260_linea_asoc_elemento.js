/**
 * LINEAS DEBEN SER ASOCIADAS A UN ELEMENTO MODELO, PARTIDA "NO ELEMENTO"
 */


/* Bloqueo de Las líneas de la factura deben ser asociadas a un elemento modelo, esto
únicamente para las partidas de inversión "No elemento" // "Partida agrupada" = 2 // auxnum1 = 2
 */
class w26260 extends workflowProg{
    constructor(){
        super('w26260', ['cabid']);
    }
    run(data){
        var mBoolBloquea = false;

        var mArrayGcomfacl = Ax.db.executeQuery(`
                <select>
                    <columns>
                        gcomfach.empcode,
                        gcomfacl.linid
                    </columns>
                    <from table='gcomfach'>
                        <join table='gcomfacl'>
                            <on>gcomfach.cabid = gcomfacl.cabid</on>
                        </join>
                    </from>
                    <where>
                        gcomfach.tipdoc IN ('FINV','FVAR','DUAF','FAGG','FAMP')
                        AND gcomfach.cabid = ?
                    </where>
                </select>
        `, data.cabid).toJSONArray();

        mArrayGcomfacl.forEach(mLine => {

            var mArrayDatCont = Ax.db.executeQuery(`
                    <select>
                        <columns>
                            gcomfacl_datc.rowid,
                            cpar_parprel.auxnum1
                        </columns>
                        <from table='gcomfacl_datc'>
                            <join table='cpar_parpreh'>
                                <on>gcomfacl_datc.codpre = cpar_parpreh.codpre</on>
                                <join table='cpar_parprel'>
                                    <on>cpar_parpreh.empcode = cpar_parprel.empcode</on>
                                    <on>cpar_parpreh.codpre = cpar_parprel.codpre</on>
                                    <on>gcomfacl_datc.codpar = cpar_parprel.codpar</on>
                                </join>
                            </join>
                        </from>
                        <where>
                            cpar_parpreh.empcode = ?
                            AND gcomfacl_datc.linid = ?
                        </where>
                    </select>
            `, mLine.empcode, mLine.linid).toJSONArray();

            mArrayDatCont.forEach(mDatCont => {

                if (mDatCont.auxnum1 == '2') {

                    var mIntNumElement = Ax.db.executeGet(`
                            <select>
                                <columns>
                                    COUNT(*)
                                </columns>
                                <from table='crp_relation_elemen_datc'/>
                                <where>
                                    crp_relation_elemen_datc.linid = ?
                                    AND crp_relation_elemen_datc.datcontid = ?
                                </where>
                            </select>
                    `, mLine.linid, mDatCont.rowid);

                    if (mIntNumElement == 0) {
                        mBoolBloquea = true;
                    }

                }
            });
        });

        return mBoolBloquea;

    }

}