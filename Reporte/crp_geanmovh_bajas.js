/**
 * OBJ: crp_geanmovh_bajas
 * */

// =================================================================
// Condición de entrada
// =================================================================
let pSqlCOND = Ax.context.property.COND.toString();
pSqlCOND = pSqlCOND.replace('geanmovh', 'virtualerp');
pSqlCOND = pSqlCOND.replace('geanmovl', 'virtualerp');
throw pSqlCOND;
// =================================================================
// Temporal Movimiento Almacen
// =================================================================
let mTmpTblMovAlmacen = Ax.db.getTempTableName(`@tmp_mov_almacen`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTblMovAlmacen}`);

Ax.db.execute(`
    <union type='all' intotemp = '@tmp_mov_almacen'>
        <!--Movimientos internos-->
        <select>
            <columns>
                geanmovh.fecmov, geanmovh.cabid,       
                geanmovh.tipdoc, geanmovd.nomdoc, 
                geanmovh.docser, geanmovh.estcab,
                geanmovh.almori, almori.nomalm nomori,
                geanmovh.almdes, almdes.nomalm nomdes,
                geanmovl.codart, garticul.nomart, 
                geanmovl.numlot,
                geanmovl.canmov, geanmovl.udmori, 
                geanmovl.impcos, geanmovl.precio,
                NVL(NVL(gcomtarl.precio, gcomtarl_usd.precio) / NVL(gart_uniconv_ori.reldes, gart_uniconv_des.reldes), NVL(gcomtarl.precio, gcomtarl_usd.precio)) <alias name='precio_tarifa' />,
                CASE WHEN gcomtarl.precio IS NOT NULL THEN 'S/.' 
                     WHEN gcomtarl.precio IS NOT NULL THEN '$' 
                     ELSE <cast type='char' size='3'>NULL</cast>
                 END <alias name='divisa_precio_tarifa' />,
                geanmovl.terdep, geanmovl.codean,
                geanmovd.tabori, geanmovh.docori,
                CASE WHEN geanmovd.albcdes IS NOT NULL THEN 'gcommovh'
                     WHEN geanmovd.albvdes IS NOT NULL THEN 'gvenmovh'
                     WHEN geanmovd.eanmdes IS NOT NULL THEN 'geanmovh'
                     ELSE <cast type='char'>NULL</cast>
                 END tabdes,
                (gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100) - ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100)) * NVL(gcomtarl.auxnum1, 0) / 100)) preciocom,
                ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100) - ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100)) * NVL(gcomtarl.auxnum1, 0) / 100)) * canmov) subtotpre,
                (geanmovl.canmov * geanmovl.impcos) subtcosto
            </columns>
            <from table='geanmovh'>
                <join table='geanmovl'>
                    <on>geanmovh.cabid = geanmovl.cabid</on>
                    <join type='left' table='gart_uniconv' alias='gart_uniconv_ori'>
                        <on>geanmovl.codart = gart_uniconv_ori.codart</on>
                        <on>geanmovl.udmori = gart_uniconv_ori.udmori</on>
                    </join>
                    <join type='left' table='gart_uniconv' alias='gart_uniconv_des'>
                        <on>geanmovl.codart = gart_uniconv_des.codart</on>
                        <on>geanmovl.udmori = gart_uniconv_des.udmdes</on>
                    </join>
                    <join type='left' table='garticul'>
                        <on>geanmovl.codart = garticul.codigo</on>
                    </join>
                    <join type='left' table='gartprov'>
                        <on>gartprov.codart = geanmovl.codart</on>
                        <on>crp_gartprov_get_supplier(<today />,'CRP0',NULL,geanmovl.codart,NULL,1,1,0) = gartprov.proid</on>
                        <join table='gproveed'>
                            <on>gproveed.codigo = gartprov.codpro</on>
                            <join table='ctercero'>
                                <on>ctercero.codigo = gproveed.codigo</on>
                            </join>
                            <join type='left' table='gcomtarl'>
                                <on>gcomtarl.codart = geanmovl.codart</on>
                                <on>gcomtarl.coduni = gartprov.udmcom</on>
                                <on>geanmovh.fecmov BETWEEN gcomtarl.vigini AND gcomtarl.vigfin</on>
                                <join table='gcomtarh'>
                                    <on>gcomtarh.cabid = gcomtarl.cabid</on>
                                    <on>gcomtarh.codigo = gproveed.tarpre</on>
                                    <on>gcomtarh.moneda = 'PEN'</on>
                                    <on>geanmovh.fecmov  BETWEEN gcomtarh.fecini AND gcomtarh.fecfin</on>
                                </join>
                            </join>
                            <join type='left' table='gcomtarl' alias='gcomtarl_usd'>
                                <on>gcomtarl_usd.codart = geanmovl.codart</on>
                                <on>gcomtarl_usd.coduni = gartprov.udmcom</on>
                                <on>geanmovh.fecmov  BETWEEN gcomtarl_usd.vigini AND gcomtarl_usd.vigfin</on>
                                <join table='gcomtarh' alias='gcomtarh_usd'>
                                    <on>gcomtarh_usd.cabid = gcomtarl_usd.cabid</on>
                                    <on>gcomtarh_usd.codigo = gproveed.tarpre</on>
                                    <on>gcomtarh_usd.moneda = 'USD'</on>
                                    <on>geanmovh.fecmov BETWEEN gcomtarh_usd.fecini AND gcomtarh_usd.fecfin</on>
                                </join>
                            </join>
                        </join>
                    </join>
                </join>
                <join table='geanmovd'>
                    <on>geanmovh.tipdoc = geanmovd.codigo</on>
                </join>
                <join table='galmacen' alias='almori'>
                    <on>geanmovh.almori = almori.codigo</on>
                </join>
                <join table='galmacen' alias='almdes'>
                    <on>geanmovh.almdes = almdes.codigo</on>
                </join>
            </from>
            <where>
                geanmovh.almdes ='CRP0291F'
                AND 1=0
                
            </where>
        </select>
        <select>
            <columns>
                geanmovh.fecmov, geanmovh.cabid,       
                geanmovh.tipdoc, geanmovd.nomdoc, 
                geanmovh.docser, geanmovh.estcab,
                geanmovh.almori, almori.nomalm nomori,
                geanmovh.almdes, almdes.nomalm nomdes,
                geanmovl.codart, garticul.nomart, 
                geanmovl.numlot,
                geanmovl.canmov, geanmovl.udmori, 
                geanmovl.impcos, geanmovl.precio,
                NVL(NVL(gcomtarl.precio, gcomtarl_usd.precio) / NVL(gart_uniconv_ori.reldes, gart_uniconv_des.reldes), NVL(gcomtarl.precio, gcomtarl_usd.precio)) <alias name='precio_tarifa' />,
                CASE WHEN gcomtarl.precio IS NOT NULL THEN 'S/.' 
                     WHEN gcomtarl.precio IS NOT NULL THEN '$' 
                     ELSE <cast type='char' size='3'>NULL</cast>
                 END <alias name='divisa_precio_tarifa' />,
                geanmovl.terdep, geanmovl.codean,
                geanmovd.tabori, geanmovh.docori,
                CASE WHEN geanmovd.albcdes IS NOT NULL THEN 'gcommovh'
                     WHEN geanmovd.albvdes IS NOT NULL THEN 'gvenmovh'
                     WHEN geanmovd.eanmdes IS NOT NULL THEN 'geanmovh'
                     ELSE <cast type='char'>NULL</cast>
                 END tabdes,
                (gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100) - ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100)) * NVL(gcomtarl.auxnum1, 0) / 100)) preciocom,
                ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100) - ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100)) * NVL(gcomtarl.auxnum1, 0) / 100)) * canmov) subtotpre,
                (geanmovl.canmov * geanmovl.impcos) subtcosto
            </columns>
            <from table='geanmovh'>
                <join table='geanmovl'>
                    <on>geanmovh.cabid = geanmovl.cabid</on>
                    <join type='left' table='gart_uniconv' alias='gart_uniconv_ori'>
                        <on>geanmovl.codart = gart_uniconv_ori.codart</on>
                        <on>geanmovl.udmori = gart_uniconv_ori.udmori</on>
                    </join>
                    <join type='left' table='gart_uniconv' alias='gart_uniconv_des'>
                        <on>geanmovl.codart = gart_uniconv_des.codart</on>
                        <on>geanmovl.udmori = gart_uniconv_des.udmdes</on>
                    </join>
                    <join type='left' table='garticul'>
                        <on>geanmovl.codart = garticul.codigo</on>
                    </join>
                    <join type='left' table='gartprov'>
                        <on>gartprov.codart = geanmovl.codart</on>
                        <on>crp_gartprov_get_supplier(<today />,'CRP0',NULL,geanmovl.codart,NULL,1,1,0) = gartprov.proid</on>
                        <join table='gproveed'>
                            <on>gproveed.codigo = gartprov.codpro</on>
                            <join table='ctercero'>
                                <on>ctercero.codigo = gproveed.codigo</on>
                            </join>
                            <join type='left' table='gcomtarl'>
                                <on>gcomtarl.codart = geanmovl.codart</on>
                                <on>gcomtarl.coduni = gartprov.udmcom</on>
                                <on>geanmovh.fecmov BETWEEN gcomtarl.vigini AND gcomtarl.vigfin</on>
                                <join table='gcomtarh'>
                                    <on>gcomtarh.cabid = gcomtarl.cabid</on>
                                    <on>gcomtarh.codigo = gproveed.tarpre</on>
                                    <on>gcomtarh.moneda = 'PEN'</on>
                                    <on>geanmovh.fecmov BETWEEN gcomtarh.fecini AND gcomtarh.fecfin</on>
                                </join>
                            </join>
                            <join type='left' table='gcomtarl' alias='gcomtarl_usd'>
                                <on>gcomtarl_usd.codart = geanmovl.codart</on>
                                <on>gcomtarl_usd.coduni = gartprov.udmcom</on>
                                <on>geanmovh.fecmov BETWEEN gcomtarl_usd.vigini AND gcomtarl_usd.vigfin</on>
                                <join table='gcomtarh' alias='gcomtarh_usd'>
                                    <on>gcomtarh_usd.cabid = gcomtarl_usd.cabid</on>
                                    <on>gcomtarh_usd.codigo = gproveed.tarpre</on>
                                    <on>gcomtarh_usd.moneda = 'USD'</on>
                                    <on>geanmovh.fecmov BETWEEN gcomtarh_usd.fecini AND gcomtarh_usd.fecfin</on>
                                </join>
                            </join>
                        </join>
                    </join>
                </join>
                <join table='geanmovd'>
                    <on>geanmovh.tipdoc = geanmovd.codigo</on>
                </join>
                <join table='galmacen' alias='almori'>
                    <on>geanmovh.almori = almori.codigo</on>
                </join>
                <join table='galmacen' alias='almdes'>
                    <on>geanmovh.almdes = almdes.codigo</on>
                </join>          
            </from>
            <where>
                geanmovh.almori ='CRP0291F'
                AND 1=0
                
            </where>
        </select>
        <!--Albarán de compras-->
        <select>
            <columns>
                gcommovh.fecmov, gcommovh.cabid,
                gcommovh.tipdoc, gcommovd.nomdoc,
                gcommovh.docser, gcommovh.estcab,
                gcommovh.almori, almori.nomalm nomori,
                gcommovh.almdes, '' nomdes,
                gcommovl.codart, garticul.nomart,
                gcommovl.numlot,
                gcommovl.canmov, '' udmori, 
                gcommovl.impcos, gcommovl.precio,
                NVL(NVL(gcomtarl.precio, gcomtarl_usd.precio) / NVL(gart_uniconv_ori.reldes, gart_uniconv_des.reldes), NVL(gcomtarl.precio, gcomtarl_usd.precio)) <alias name='precio_tarifa' />,
                CASE WHEN gcomtarl.precio IS NOT NULL THEN 'S/.' 
                     WHEN gcomtarl.precio IS NOT NULL THEN '$' 
                     ELSE <cast type='char' size='3'>NULL</cast>
                 END <alias name='divisa_precio_tarifa' />,
                gcommovl.terdep, '' codean,
                gcommovd.tabori, gcommovh.docori,
                '' tabdes, 
                (gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100) - ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100)) * NVL(gcomtarl.auxnum1, 0) / 100)) preciocom,
                ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100) - ((gcomtarl.precio - (gcomtarl.precio * NVL(gcomtarl.dtouni, 0) / 100)) * NVL(gcomtarl.auxnum1, 0) / 100)) * canmov) subtotpre,
                (gcommovl.canmov * gcommovl.impcos) subtcosto
            </columns>
            <from table='gcommovh'>
                <join table='gcommovl'>
                    <on>gcommovh.cabid = gcommovl.cabid</on>
                    <join type='left' table='gart_uniconv' alias='gart_uniconv_ori'>
                        <on>gcommovl.codart = gart_uniconv_ori.codart</on>
                    </join>
                    <join type='left' table='gart_uniconv' alias='gart_uniconv_des'>
                        <on>gcommovl.codart = gart_uniconv_des.codart</on>
                    </join>
                    <join type='left' table='garticul'>
                        <on>gcommovl.codart = garticul.codigo</on>
                    </join>
                    <join type='left' table='gartprov'>
                        <on>gartprov.codart = gcommovl.codart</on>
                        <on>crp_gartprov_get_supplier(<today />,'CRP0',NULL,gcommovl.codart,NULL,1,1,0) = gartprov.proid</on>
                        <join table='gproveed'>
                            <on>gproveed.codigo = gartprov.codpro</on>
                            <join table='ctercero'>
                                <on>ctercero.codigo = gproveed.codigo</on>
                            </join>
                            <join type='left' table='gcomtarl'>
                                <on>gcomtarl.codart = gcommovl.codart</on>
                                <on>gcomtarl.coduni = gartprov.udmcom</on>
                                <on>gcommovh.fecmov BETWEEN gcomtarl.vigini AND gcomtarl.vigfin</on>
                                <join table='gcomtarh'>
                                    <on>gcomtarh.cabid = gcomtarl.cabid</on>
                                    <on>gcomtarh.codigo = gproveed.tarpre</on>
                                    <on>gcomtarh.moneda = 'PEN'</on>
                                    <on>gcommovh.fecmov  BETWEEN gcomtarh.fecini AND gcomtarh.fecfin</on>
                                </join>
                            </join>
                            <join type='left' table='gcomtarl' alias='gcomtarl_usd'>
                                <on>gcomtarl_usd.codart = gcommovl.codart</on>
                                <on>gcomtarl_usd.coduni = gartprov.udmcom</on>
                                <on>gcommovh.fecmov  BETWEEN gcomtarl_usd.vigini AND gcomtarl_usd.vigfin</on>
                                <join table='gcomtarh' alias='gcomtarh_usd'>
                                    <on>gcomtarh_usd.cabid = gcomtarl_usd.cabid</on>
                                    <on>gcomtarh_usd.codigo = gproveed.tarpre</on>
                                    <on>gcomtarh_usd.moneda = 'USD'</on>
                                    <on>gcommovh.fecmov BETWEEN gcomtarh_usd.fecini AND gcomtarh_usd.fecfin</on>
                                </join>
                            </join>
                        </join>
                    </join>
                </join>
                <join table='gcommovd'>
                    <on>gcommovh.tipdoc = gcommovd.codigo</on>
                </join>
                <join table='galmacen' alias='almori'>
                    <on>gcommovh.almori = almori.codigo</on>
                </join>
            </from>
            <where>
                gcommovh.tipdoc ='AACF'
                
            </where>
        </select>  
    </union>
`);

var mRsMovAlmacen = Ax.db.executeQuery(` 
    <select>
        <columns>
            *
        </columns>
        <from table='${mTmpTblMovAlmacen}' alias='virtualerp'/>
        <where>
            ${pSqlCOND}
        </where>
    </select>
`);

return mRsMovAlmacen;