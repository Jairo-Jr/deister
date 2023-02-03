let m_date = Ax.db.executeGet(`
        <select>
            <columns>
                crp_semaforo_control.date_sync
            </columns>
            <from table='crp_semaforo_control' />
            <where>
                crp_semaforo_control.codigo = 'crp_intermedia_xrpmaep'
            </where>
        </select>
    `);

let rs = Ax.db.executeQuery(`
    <select>
        <columns>
            garticul.codigo                                                                             <alias name='dcodaxi' />,
            garticul_ext.code_chavin                                                                    <alias name='dcodpro' />,
            CASE WHEN garticul_ext.code_digemid IS NULL THEN '0'
                ELSE garticul_ext.code_digemid
            END                                                                                         <alias name='dcdigmd' />,
            garticul.nomart                                                                             <alias name='ddespro' />,
            garticul_ext.concentracion                                                                  <alias name='ddosism' />,
            '1'                                                                                         <alias name='dcntenv' />,
            crp_laboratorio.codlab_chav                                                                 <alias name='dcodlab' />,
            garticul_ext.code_cumseps                                                                   <alias name='dcoseps' />,
            SUBSTR(crp_familia_flexline.codigo, 2)                                                      <alias name='dcodmin' />,
            ctercero_ext.codpro_chv                                                                     <alias name='dcodprv' />,
            crp_familia_flexline.unspsc                                                                 <alias name='dcodsnt' />,
            CASE WHEN gart_relcom.reldes IS NULL THEN '1'
                ELSE CAST(ROUND(gart_relcom.reldes) AS VARCHAR(10))
            END                                                                                         <alias name='dnruniv' />,
            CASE WHEN crp_fuente.codigo = '0001' THEN 'C'
                    WHEN crp_fuente.codigo = '0002' THEN 'F'
                    WHEN crp_fuente.codigo = '0003' THEN 'G'
                    WHEN crp_fuente.codigo = '0004' THEN 'I'
                    WHEN crp_fuente.codigo = '0005' THEN 'A'
            END                                                                                         <alias name='dcomgen' />,
            garticul_ext.concentracion                                                                  <alias name='dconcnt' />,
            CASE WHEN garticul.auxchr5 = 'R' THEN 'S'
                    WHEN garticul.auxchr5 = 'T' THEN 'N'
            END                                                                                         <alias name='dpetito' />,
            CASE WHEN gcomtarl.vigfin > <today /> 
                    THEN (gcomtarl.precio - (gcomtarl.precio * gcomtarl.dtouni / 100) - (gcomtarl.precio * gcomtarl.auxnum1 / 100))
                    ELSE (gcomtarl_usd.precio - (gcomtarl_usd.precio * gcomtarl_usd.dtouni / 100) - (gcomtarl_usd.precio * gcomtarl_usd.auxnum1 / 100))
                END                                                                                     <alias name='dprecom' />,
            CASE WHEN gcomtarl.vigfin > <today /> 
                    THEN gcomtarl.precio
                    ELSE gcomtarl_usd.precio
            END                                                                                         <alias name='dprelis' />,
            CASE WHEN tarl_venta.vigfin > <today /> 
                    THEN tarl_venta.precio
                    ELSE tarl_venta_usd.precio
                END                                                                                     <alias name='dprevta' />,
            'N'                                                                                         <alias name='dpropro' />,
            CASE WHEN crp_status_producto.codigo = '0001' THEN 'C'
                WHEN crp_status_producto.codigo = '0002' THEN 'E'
                WHEN crp_status_producto.codigo = '0003' THEN '13'
                WHEN crp_status_producto.codigo = '0004' THEN 'I'
            END                                                                                         <alias name='dtgrupo' />,
            garticul_ext.reg_sanitario                                                                  <alias name='dregsan' />,
            NVL((SELECT SUM(galmstkn.stkmax) FROM galmstkn WHERE galmstkn.codart = garticul.codigo), 0) <alias name='dstomax' />,
            NVL((SELECT SUM(galmstkn.stkmin) FROM galmstkn WHERE galmstkn.codart = garticul.codigo), 0) <alias name='dstomin' />,
            crp_tipo_susalud.codigo                                                                     <alias name='dtipsnt' />,
            crp_forma_farmaceutica.codigo                                                               <alias name='dformas' />,
            garticul.udmcom                                                                             <alias name='dcodenv' />,
            garticul.udmcom                                                                             <alias name='dunmedc' />,
            garticul.udmven                                                                             <alias name='dunmedv' />,
            crp_volumen.descri                                                                          <alias name='dundcon' />,
            crp_volumen.descri                                                                          <alias name='dunivol' />,
            <nvl>garticul_ext.volumen, 0</nvl>                                                          <alias name='dvalvol' />,
            <nvl>garticul_ext.volumen, 0</nvl>                                                          <alias name='dprtvta' />,
            crp_formag.cod_grupo                                                                        <alias name='dfrmgrp' />,
            crp_formag.cod_detalle                                                                      <alias name='dfrmcod' />,
            garticul_ext.code_gtin                                                                      <alias name='dcean13' />,
            SUBSTR(nomart, 0, CHARINDEX(' ', nomart))                                                   <alias name='ddesmed' />,
            crp_forma_farmaceutica.codigo                                                               <alias name='dforpre' />,
            CASE WHEN gcomtarl.vigfin > <today /> THEN 'S'
                    ELSE 'D' 
                END                                                                                     <alias name='dmoneda' />,
            garticul.date_created                                                                       <alias name='dfecdig' />, 
            <!-- FALTA DULFCOM -->
            gstatges.nomest                                                                             <alias name='dmegago' />,
            NVL(gcomtarh.fecfin, CAST('31-12-2050' AS DATE))                                            <alias name='dfchvnc' />,
            CASE WHEN garticul_ext.is_bonifica = 'N' THEN 'NO'
                    WHEN garticul_ext.is_bonifica = 'S' THEN 'SI'
            END                                                                                         <alias name='dbonifi' />,
            gstatges.nomest                                                                             <alias name='destado' />,
            garticul.user_updated                                                                       <alias name='dultusu' />,
            garticul.date_updated                                                                       <alias name='dfulusu' />,
            SUBSTR(CAST(garticul.date_updated AS VARCHAR(19)), 12, 5)                                   <alias name='dhulusu' />,
            CASE WHEN NVL(gart_relcom.reldes, -1) > 999 THEN CAST(garticul.udmcom AS VARCHAR(3)) || '*' || <nvl>TRIM(CAST(ROUND(gart_relcom.reldes) AS VARCHAR(5))), '1'</nvl>
                    ELSE CAST(garticul.udmcom AS VARCHAR(3)) || ' * ' || <nvl>TRIM(CAST(ROUND(gart_relcom.reldes) AS VARCHAR(5))), '1'</nvl>
                    END                                                                                    <alias name='dprepro' />,
            crp_forma_farmaceutica.descri                                                               <alias name='ddesfor' />,
            crp_unimed_com.descri                                                                       <alias name='ddesumc' />,
            crp_unimed_ven.descri                                                                       <alias name='ddesumv' />,
            crp_unimed_com.descri                                                                       <alias name='ddesenv' />,
            crp_familia_flexline.descri                                                                 <alias name='ddesmin' />,
            crp_laboratorio.descri                                                                      <alias name='ddeslab' />,
            ctercero.nombre                                                                             <alias name='ddesprv' />,
            gcomtarl.dtouni                                                                             <alias name='ddscmed' />,
            '+'                                                                                         <alias name='dtipope' />,
            gcomtarl.auxnum1                                                                            <alias name='ddscme1' />,
            SUBSTR(REPLACE(CAST(gcomtarl.date_updated AS VARCHAR(19)), '-'), 0, 8)                      <alias name='dfecdsc' />,
            gcomtarl.auxnum2                                                                            <alias name='dcntbon' />,
            SUBSTR(REPLACE(CAST(gcomtarl.date_updated AS VARCHAR(19)), '-'), 0, 8)                      <alias name='dfecbon' />,
            tarl_venta.dtouni                                                                           <alias name='ddscvta' />,
            SUBSTR(REPLACE(CAST(tarl_venta.date_updated AS VARCHAR(19)), '-'), 0, 8)                    <alias name='dfecvta' />,
            CASE WHEN garticul_ext.code_gtin IS NULL THEN 'T'
                    ELSE 'F'
            END                                                                                         <alias name='dlean13' />,
            crp_grupo_suministro.codigo                                                                 <alias name='dgrpins' />,
            crp_subgrupo_suministro.codigo                                                              <alias name='dcodins' />,
            TO_CHAR(CURRENT, '%Y%m%d%H%M%S')                                                            <alias name='fechahora' />,
            'U'                                                                                         <alias name='accion' />,
            'P'                                                                                         <alias name='estado_migracion_crp' />,
            'P'                                                                                         <alias name='estado_migracion_pls' />,
            garticul.date_updated <alias name='date_updated_axional' />,
            garticul.date_created <alias name='date_created_axional' />
        </columns>
        <from table='garticul'>
            <join table='garticul_ext'>
                <on>garticul.codigo = garticul_ext.codigo</on>
                <join type='left' table='crp_tipo_producto'>
                    <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                    <on>crp_tipo_producto.indfarmalog = 'FARMA'</on>
                    <join type='left' table='galmacen'>
                        <on>crp_tipo_producto.codalm_default = galmacen.codigo</on>
                    </join>
                    <join type='left' table='galmstkn'>
                        <on>galmstkn.codalm = crp_tipo_producto.codalm_default</on>
                        <on>galmstkn.codart = garticul.codigo</on>
                        <on>galmstkn.varlog = '0'</on>
                    </join>
                </join>
                <join type='left' table='crp_fuente'>
                    <on>garticul_ext.fuente = crp_fuente.codigo</on>
                </join>
                <join type='left' table='crp_status_producto'>
                    <on>garticul_ext.status = crp_status_producto.codigo</on>
                </join>
                <join type='left' table='crp_formag'>
                    <on>garticul_ext.formag = crp_formag.codigo</on>
                </join>
                <join type='left' table='crp_tipo_existencia'>
                    <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                </join>
                <join type='left' table='crp_grupo_suministro'>
                    <on>garticul_ext.grupo_suministro = crp_grupo_suministro.codigo</on>
                </join>
                <join type='left' table='crp_subgrupo_suministro'>
                    <on>garticul_ext.subgrupo_suminis = crp_subgrupo_suministro.codigo</on>
                </join>
                <join type='left' table='crp_forma_farmaceutica'>
                    <on>garticul_ext.code_forfar = crp_forma_farmaceutica.codigo</on>
                </join>
                <join type='left' table='crp_volumen'>
                    <on>garticul_ext.code_volumen = crp_volumen.codigo</on>
                </join>
                <join type='left' table='crp_tipo_susalud'>
                    <on>garticul_ext.tipart_susalud = crp_tipo_susalud.codigo</on>
                </join> 
                <join type='left' table='crp_psicotropico'>
                    <on>garticul_ext.psicotropico = crp_psicotropico.codigo</on>
                </join>
            </join>
            <join type='left' table='gartfami'>
                <on>garticul.codfam = gartfami.codigo</on>
            </join>
            <join type='left' table='crp_familia_flexline'>
                <on>garticul.webfam = crp_familia_flexline.codigo</on>
            </join>
            <join type='left' table='garttipo'>
                <on>garticul.codtip = garttipo.codigo</on>
            </join>
            <join type='left' table='crp_principio_activo'>
                <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
            </join>
            <join type='left' table='crp_unimed'>
                <on>garticul.udmbas = crp_unimed.codigo</on>
            </join>
            <join type='left' table='crp_unimed' alias='crp_unimed_ven'>
                <on>garticul.udmven = crp_unimed_ven.codigo</on>
            </join>
            <join type='left' table='crp_unimed' alias='crp_unimed_com'>
                <on>garticul.udmcom = crp_unimed_com.codigo</on>
            </join>
            <join type='left' table='ctax_artkey'>
                <on>garticul.taxkey = ctax_artkey.artk_code</on>
            </join>
            <join type='left' table='crp_laboratorio'>
                <on>garticul.fabric = crp_laboratorio.codigo</on>
            </join>
            <join type='left' table='gstatges'>
                <on>garticul.estges = gstatges.codigo</on>
            </join>
            <join type='left' table='gartprov'>
                <on>gartprov.codart = garticul.codigo</on>
                <on>crp_gartprov_get_supplier(<today />,'CRP0',NULL,garticul.codigo,NULL,1,1,0) = gartprov.proid</on>
                <join table='gproveed'>
                    <on>gproveed.codigo = gartprov.codpro</on>
                    <join table='ctercero'>
                        <on>ctercero.codigo = gproveed.codigo</on>
                        <join table='ctercero_ext'>
                            <on>ctercero.codigo = ctercero_ext.codigo</on>
                        </join>
                    </join>
                    <join type='left' table='gcomtarl'>
                        <on>gcomtarl.codart = garticul.codigo</on>
                        <on>gcomtarl.coduni = gartprov.udmcom</on>
                        <on><today /> BETWEEN gcomtarl.vigini AND gcomtarl.vigfin</on>
                        <join table='gcomtarh'>
                            <on>gcomtarh.cabid = gcomtarl.cabid</on>
                            <on>gcomtarh.codigo = gproveed.tarpre</on>
                            <on>gcomtarh.moneda = 'PEN'</on>
                            <on><today /> BETWEEN gcomtarh.fecini AND gcomtarh.fecfin</on>
                        </join>
                    </join>
                    <join type='left' table='gcomtarl' alias='gcomtarl_usd'>
                        <on>gcomtarl_usd.codart = garticul.codigo</on>
                        <on>gcomtarl_usd.coduni = gartprov.udmcom</on>
                        <on><today /> BETWEEN gcomtarl_usd.vigini AND gcomtarl_usd.vigfin</on>
                        <join table='gcomtarh' alias='gcomtarh_usd'>
                            <on>gcomtarh_usd.cabid = gcomtarl_usd.cabid</on>
                            <on>gcomtarh_usd.codigo = gproveed.tarpre</on>
                            <on>gcomtarh_usd.moneda = 'USD'</on>
                            <on><today /> BETWEEN gcomtarh_usd.fecini AND gcomtarh_usd.fecfin</on>
                        </join>
                    </join>
                </join>
            </join>
            <!-- TARIFAS DE VENTA [PEN] -->
            <join type='left' table='gventarl' alias='tarl_venta'>
                <on>tarl_venta.codart = garticul.codigo</on>
                <on>tarl_venta.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_venta.vigini AND tarl_venta.vigfin</on>
                <join table='gventarh' alias='tarh_venta'>
                    <on>tarh_venta.cabid = tarl_venta.cabid</on>
                    <on>tarh_venta.codigo = 'LP_VENTA'</on>
                    <on>tarh_venta.moneda = 'PEN'</on>
                    <on><today /> BETWEEN tarh_venta.fecini AND tarh_venta.fecfin</on>
                </join>            
            </join>
            <join type='left' table='gventarl' alias='tarl_tercero'>
                <on>tarl_tercero.codart = garticul.codigo</on>
                <on>tarl_tercero.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_tercero.vigini AND tarl_tercero.vigfin</on>
                <join table='gventarh' alias='tarh_tercero'>
                    <on>tarh_tercero.cabid = tarl_tercero.cabid</on>
                    <on>tarh_tercero.codigo = 'LP_TERCERO'</on>
                    <on>tarh_tercero.moneda = 'PEN'</on>
                    <on><today /> BETWEEN tarh_tercero.fecini AND tarh_tercero.fecfin</on>
                </join>            
            </join>
            <join type='left' table='gventarl' alias='tarl_sede'>
                <on>tarl_sede.codart = garticul.codigo</on>
                <on>tarl_sede.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_sede.vigini AND tarl_sede.vigfin</on>
                <join table='gventarh' alias='tarh_sede'>
                    <on>tarh_sede.cabid = tarl_sede.cabid</on>
                    <on>tarh_sede.codigo = 'LP_SEDE'</on>
                    <on>tarh_sede.moneda = 'PEN'</on>
                    <on><today /> BETWEEN tarh_sede.fecini AND tarh_sede.fecfin</on>
                </join>            
            </join>
            <join type='left' table='gventarl' alias='tarl_otc'>
                <on>tarl_otc.codart = garticul.codigo</on>
                <on>tarl_otc.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_otc.vigini AND tarl_otc.vigfin</on>
                <join table='gventarh' alias='tarh_otc'>
                    <on>tarh_otc.cabid = tarl_otc.cabid</on>
                    <on>tarh_otc.codigo = 'LP_OTC'</on>
                    <on>tarh_otc.moneda = 'PEN'</on>
                    <on><today /> BETWEEN tarh_otc.fecini AND tarh_otc.fecfin</on>
                </join>            
            </join>
            <!-- TARIFAS DE VENTA [USD] -->
            <join type='left' table='gventarl' alias='tarl_venta_usd'>
                <on>tarl_venta_usd.codart = garticul.codigo</on>
                <on>tarl_venta_usd.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_venta_usd.vigini AND tarl_venta_usd.vigfin</on>
                <join table='gventarh' alias='tarh_venta_usd'>
                    <on>tarh_venta_usd.cabid = tarl_venta_usd.cabid</on>
                    <on>tarh_venta_usd.codigo = 'LP_VENTA'</on>
                    <on>tarh_venta_usd.moneda = 'USD'</on>
                    <on><today /> BETWEEN tarh_venta_usd.fecini AND tarh_venta_usd.fecfin</on>
                </join>            
            </join>
            <join type='left' table='gventarl' alias='tarl_tercero_usd'>
                <on>tarl_tercero_usd.codart = garticul.codigo</on>
                <on>tarl_tercero_usd.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_tercero_usd.vigini AND tarl_tercero_usd.vigfin</on>
                <join table='gventarh' alias='tarh_tercero_usd'>
                    <on>tarh_tercero_usd.cabid = tarl_tercero_usd.cabid</on>
                    <on>tarh_tercero_usd.codigo = 'LP_TERCERO'</on>
                    <on>tarh_tercero_usd.moneda = 'USD'</on>
                    <on><today /> BETWEEN tarh_tercero_usd.fecini AND tarh_tercero_usd.fecfin</on>
                </join>            
            </join>
            <join type='left' table='gventarl' alias='tarl_sede_usd'>
                <on>tarl_sede_usd.codart = garticul.codigo</on>
                <on>tarl_sede_usd.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_sede_usd.vigini AND tarl_sede_usd.vigfin</on>
                <join table='gventarh' alias='tarh_sede_usd'>
                    <on>tarh_sede_usd.cabid = tarl_sede_usd.cabid</on>
                    <on>tarh_sede_usd.codigo = 'LP_SEDE'</on>
                    <on>tarh_sede_usd.moneda = 'USD'</on>
                    <on><today /> BETWEEN tarh_sede_usd.fecini AND tarh_sede_usd.fecfin</on>
                </join>            
            </join>
            <join type='left' table='gventarl' alias='tarl_otc_usd'>
                <on>tarl_otc_usd.codart = garticul.codigo</on>
                <on>tarl_otc_usd.coduni = garticul.udmven</on>
                <on><today /> BETWEEN tarl_otc_usd.vigini AND tarl_otc_usd.vigfin</on>
                <join table='gventarh' alias='tarh_otc_usd'>
                    <on>tarh_otc_usd.cabid = tarl_otc_usd.cabid</on>
                    <on>tarh_otc_usd.codigo = 'LP_OTC'</on>
                    <on>tarh_otc_usd.moneda = 'USD'</on>
                    <on><today /> BETWEEN tarh_otc_usd.fecini AND tarh_otc_usd.fecfin</on>
                </join>
            </join>
            <join type='left' table='gart_uniconv' alias='gart_relcom'>
                <on>gart_relcom.codart = garticul.codigo</on>
                <on>gart_relcom.udmori = garticul.udmcom</on>
                <on>gart_relcom.udmdes = garticul.udmbas</on>
                <on>gart_relcom.relori = 1</on>
            </join>
            <join type='left' table='gart_uniconv' alias='gart_relven'>
                <on>gart_relven.codart = garticul.codigo</on>
                <on>gart_relven.udmori = garticul.udmven</on>
                <on>gart_relven.udmdes = garticul.udmbas</on>
                <on>gart_relven.relori = 1</on>
            </join>
        </from>
        <where>
                garticul.codtip IN ('01', '02')
            AND garticul.estado = 'A'
            AND garticul_ext.code_chavin IS NOT NULL
            AND garticul.date_updated &gt; ?
        </where>
    </select>`, m_date);

for (let row of rs) {
    console.log(row.dcodaxi);
    Ax.db.insert('crp_intermedia_xrpmaep', row);
}

var rs2 = Ax.db.executeQuery(`
        <select>
            <columns>
                crp_intermedia_xrpmaep.dcodaxi, crp_intermedia_xrpmaep.dcodpro, CAST(crp_intermedia_xrpmaep.dcdigmd AS INTEGER) <alias name='dcdigmd' />, crp_intermedia_xrpmaep.ddespro, crp_intermedia_xrpmaep.ddosism, 
                crp_intermedia_xrpmaep.dcntenv, crp_intermedia_xrpmaep.dcodlab, crp_intermedia_xrpmaep.dcoseps, crp_intermedia_xrpmaep.dcodmin, crp_intermedia_xrpmaep.dcodprv, 
                crp_intermedia_xrpmaep.dcodsnt, crp_intermedia_xrpmaep.dnruniv, crp_intermedia_xrpmaep.dcomgen, crp_intermedia_xrpmaep.dconcnt, crp_intermedia_xrpmaep.dcntcom, 
                crp_intermedia_xrpmaep.dpetito, crp_intermedia_xrpmaep.dprecom, crp_intermedia_xrpmaep.dprelis, crp_intermedia_xrpmaep.dprevta, crp_intermedia_xrpmaep.dpropro,
                crp_intermedia_xrpmaep.dtgrupo, crp_intermedia_xrpmaep.dregsan, crp_intermedia_xrpmaep.dstomax, crp_intermedia_xrpmaep.dstomin, crp_intermedia_xrpmaep.dtipsnt, 
                crp_intermedia_xrpmaep.dformas, crp_intermedia_xrpmaep.dcodenv, crp_intermedia_xrpmaep.dunmedc, crp_intermedia_xrpmaep.dunmedv, crp_intermedia_xrpmaep.dundcon, 
                crp_intermedia_xrpmaep.dunivol, crp_intermedia_xrpmaep.dvalvol, crp_intermedia_xrpmaep.dprtvta, crp_intermedia_xrpmaep.dfrmgrp, crp_intermedia_xrpmaep.dfrmcod, 
                crp_intermedia_xrpmaep.dcean13, crp_intermedia_xrpmaep.dcodrel, crp_intermedia_xrpmaep.ddesmed, crp_intermedia_xrpmaep.dforpre, crp_intermedia_xrpmaep.dmoneda,
                crp_intermedia_xrpmaep.dcodgpo, crp_intermedia_xrpmaep.dautalm, crp_intermedia_xrpmaep.dfecdig, crp_intermedia_xrpmaep.digunom, crp_intermedia_xrpmaep.diteord, 
                crp_intermedia_xrpmaep.digucar, crp_intermedia_xrpmaep.dvtapar, crp_intermedia_xrpmaep.dprevt1, crp_intermedia_xrpmaep.dprevt1, crp_intermedia_xrpmaep.dulfvta, 
                crp_intermedia_xrpmaep.dufcpvt, crp_intermedia_xrpmaep.dulfvre, crp_intermedia_xrpmaep.dulfcom, crp_intermedia_xrpmaep.duldscc, crp_intermedia_xrpmaep.dlstgrp, 
                crp_intermedia_xrpmaep.dflaeve, crp_intermedia_xrpmaep.dmaname, crp_intermedia_xrpmaep.dflamed, crp_intermedia_xrpmaep.dmedago, crp_intermedia_xrpmaep.dfchvnc, 
                crp_intermedia_xrpmaep.dstcero, crp_intermedia_xrpmaep.dstcero, crp_intermedia_xrpmaep.dnocbrt, crp_intermedia_xrpmaep.dnopvta, crp_intermedia_xrpmaep.dobserv, 
                crp_intermedia_xrpmaep.dbonifi, crp_intermedia_xrpmaep.danulad, crp_intermedia_xrpmaep.dcntado, crp_intermedia_xrpmaep.destado, crp_intermedia_xrpmaep.dultusu, 
                crp_intermedia_xrpmaep.dfulusu, crp_intermedia_xrpmaep.dhulusu, crp_intermedia_xrpmaep.trans01, crp_intermedia_xrpmaep.trans02, crp_intermedia_xrpmaep.dpremed, 
                crp_intermedia_xrpmaep.dprepro, crp_intermedia_xrpmaep.ddesfor, crp_intermedia_xrpmaep.ddesumc, crp_intermedia_xrpmaep.ddesumv, crp_intermedia_xrpmaep.ddesenv, 
                crp_intermedia_xrpmaep.ddesmin, crp_intermedia_xrpmaep.ddeslab, crp_intermedia_xrpmaep.ddesprv, crp_intermedia_xrpmaep.ddscmed, crp_intermedia_xrpmaep.dtipope, 
                crp_intermedia_xrpmaep.ddscme1, crp_intermedia_xrpmaep.dfecdsc, crp_intermedia_xrpmaep.ddscbon, crp_intermedia_xrpmaep.dcntbon, crp_intermedia_xrpmaep.dfecbon, 
                crp_intermedia_xrpmaep.ddscvta, crp_intermedia_xrpmaep.dfecvta, crp_intermedia_xrpmaep.dlean13, crp_intermedia_xrpmaep.dgrpins, crp_intermedia_xrpmaep.dcodins, 
                crp_intermedia_xrpmaep.fechahora, crp_intermedia_xrpmaep.accion, crp_intermedia_xrpmaep.estado_migracion_crp, crp_intermedia_xrpmaep.fecha_migracion_crp, crp_intermedia_xrpmaep.observacion_crp, 
                crp_intermedia_xrpmaep.estado_migracion_pls, crp_intermedia_xrpmaep.fecha_migracion_pls, crp_intermedia_xrpmaep.observacion_pls, crp_intermedia_xrpmaep.date_updated_axional
            </columns>
            <from table='crp_intermedia_xrpmaep' />
            <where>
                crp_intermedia_xrpmaep.dfulusu &gt; ?
            </where>
        </select>`
    , m_date);

const mStrDb = Ax.db.of("BD_CRP_INT_AXIONAL");

for (let row of rs2) {
    console.log(row.dcodaxi);
    mStrDb.insert('xrpmaep', row);
    Ax.db.update('crp_semaforo_control', { date_sync: new Ax.util.Date() }, '1=1');
}