var pStrProtocolo = '20230248';
var mTmpTable = Ax.db.getTempTableName(`tmp_cta_solicitud`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable}`);

Ax.db.execute(`
    SELECT  DISTINCT
            gcomfach.cabid, 
            NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol,
            gcomsolh.coment
    FROM  gcomfacl,
            gcomfach,
            gcomalbl,
            gcompedl,
            gcompedh,
            gcompedd,
            gcomsoll_dist,
            gcomsolh,
            gcomsoll
    WHERE gcomfacl.cabid        = gcomfach.cabid
        AND gcomfacl.tabori       = 'gcommovh'
        AND gcomfacl.cabori       = gcomalbl.cabid
        AND gcomfacl.linori       = gcomalbl.linid
        AND gcomalbl.tabori       = 'gcompedh'
        AND gcomalbl.cabori       = gcompedl.cabid
        AND gcomalbl.linori       = gcompedl.linid
        AND gcompedl.cabid        = gcomsoll_dist.cabid
        AND gcompedl.codart       = gcomsoll_dist.codart
        AND gcompedl.cabid        = gcompedh.cabid
        AND gcompedh.tipdoc       = gcompedd.codigo
        AND gcomsoll_dist.tabname = 'gcompedh'
        AND gcomsoll_dist.cabsol  = gcomsolh.cabid
        AND gcomsolh.cabid        = gcomsoll.cabid
        AND gcompedd.circui       = 'LOG'
        AND gcomfach.auxchr5      = ?
        INTO TEMP ${mTmpTable} WITH NO LOG
`, pStrProtocolo);

    var mRsXdoccta = Ax.db.executeQuery(`
            <select>
            <columns>
                gcomfach.cabid,
                gcomfach.auxchr5 || gcomfach.auxnum1                              <alias name='dnrorec' />,         <!-- Protocolo y correlativo -->
                SUBSTR(gcontipo.nomcon, 0, ((CHARINDEX('-', gcontipo.nomcon)-1))) <alias name='dctagas' />,         <!-- Cuenta de gasto -->
                (SELECT MAX(cencos)
                    FROM crp_chv_mapcen
                    WHERE crp_chv_mapcen.area = 'L'
                    AND seccio in (SELECT seccio 
                                        FROM gdeparta 
                                    WHERE depart = mTemporalTable.depart_sol))     <alias name='dctacos' />,       <!-- Cuenta de costo -->
                ''                                                                 <alias name='dexistencia' />,   <!-- Cuenta de existencia -->
                ''                                                                 <alias name='dvalor' />,        <!-- Valor -->
                mTemporalTable.coment                                              <alias name='dglosa' />         <!-- Glosa -->
            </columns>   
            <from table='gcomfach'>
                <join table='gcomfacl'>
                    <on>gcomfach.cabid = gcomfacl.cabid</on>
                </join>
                <join type='left' table='${mTmpTable}' alias='mTemporalTable'>
                    <on>gcomfach.cabid = mTemporalTable.cabid</on>
                </join>
                <join table='garticul'>
                    <on>gcomfacl.codart = garticul.codigo </on>
                    <join table='gcontipo'>
                        <on>garticul.tipcon = gcontipo.codigo </on>
                    </join>x
                </join>
            </from>
            <where>
                gcomfach.auxchr5    = ? 
            </where>
        </select>
    `, pStrProtocolo);
    
return mRsXdoccta;

