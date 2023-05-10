/**
 * Buscar por el protocolo
*/
var cabid = 14380; //14474 - 14182 - 11653 - 12601

/* TMP - 1: Agrupar los loteid de albaranes */
var mTmpGcomalbh = Ax.db.getTempTableName(`@tmp_cabib_gcomalbh`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpGcomalbh}`);

Ax.db.execute(`
    <select intotemp='${mTmpGcomalbh}'>
        <columns>
            gcomalbh.cabid,
            gcomalbh.loteid
        </columns>
        <from table='gcomfach'>
            <join table='gcomfacl'>
                <on>gcomfach.cabid = gcomfacl.cabid</on>
                <join table='gcomalbh'>
                    <on>gcomfacl.cabori = gcomalbh.cabid</on>
                </join>
            </join>
        </from>
        <where>
            gcomfacl.tabori = 'gcommovh'
            AND gcomfach.cabid = ?
        </where>
        <group>gcomalbh.cabid, gcomalbh.loteid</group>
    </select>
`, cabid);

/* TMP - 2 */
var mSqlCapuntes = Ax.db.executeQuery(`
    <select>
        <columns>
            capuntes.loteid,

            MAX( CASE WHEN capuntes.cuenta LIKE '60%' THEN crp_chv_mapcta.ctaori
                ELSE ''
            END ) <alias name='dctacos' />,
            
            MAX( CASE WHEN capuntes.cuenta LIKE '61%' THEN crp_chv_mapcta.ctaori
                ELSE ''
            END ) <alias name='dexistencia' />,

            MAX (CASE WHEN capuntes.cuenta LIKE '25%' THEN crp_chv_mapcta.ctaori
                ELSE ''
            END ) <alias name='dvalor' />,

            MAX (capuntes.concep ) <alias name='concep' />

        </columns>
        <from table='capuntes'>
            <join table='${mTmpGcomalbh}' alias='tmp_gcomalbh'>
                <on>capuntes.loteid = tmp_gcomalbh.loteid</on>
            </join>

            <join table='crp_chv_mapcta'>
                <on>capuntes.cuenta = crp_chv_mapcta.cuenta</on>
            </join>
        </from>
        <where>
            (capuntes.cuenta LIKE '60%'
            OR capuntes.cuenta LIKE '61%'
            OR capuntes.cuenta LIKE '25%')
        </where>
        <group>1</group>
        <!-- <group>1, 2, 3, 4</group> -->
    </select>
`);


var mSqlGcomfach = Ax.db.executeQuery(`
    <select>
        <columns>
            gcomfach.cabid,
            gcomfach.auxchr5 || gcomfach.auxnum1                              <alias name='dnrorec' />,         <!-- Protocolo y correlativo -->
            *

        </columns>
        <from table='gcomfach'>

            <!-- <join table='crp_chv_mapcta'>
                <on>capuntes.cuenta = crp_chv_mapcta.cuenta</on>
            </join> -->
        </from>
        <where>
            gcomfach.cabid = ?
        </where>
    </select>
`, cabid);

return mSqlGcomfach;