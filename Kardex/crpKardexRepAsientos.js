/* COPIA DEV 01/10/2023 */
/**
 *  Copyright (c) 1988-2019 deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 * 'Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The copyright notice above does not evidence any actual or intended publication
 *  for disclosure of this source code, which includes information that is confidential
 *  and/or proprietary, and is a trade secret, of deister software
 *
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE,
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 *
 *
 * -----------------------------------------------------------------------------
 *
 *  FUNCTION JS: crpKardexRepAsientos()
 *  *
 *  Version:       V1.0
 *  Date:          05th Sep 2022
 *  Description:   Traza de movimientos de todos los artículo (Kardex)
 *                 LLamado desde el objeto de reporte [crp_kardex_rep]
 *                 Recopila: Saldo inicial `+ Entradas - Salidas a partir de los
 *                 registros en [glog_stkmov]
 *
 */

function crpKardexRepAsientos(pDateFecini, pDateFecfin, pSqlCond, pStrExcel) {

    /* Obtenemos el año, el mes y el día por separado */
    let mIntYear = pDateFecini.getFullYear();
    let mIntMonth = pDateFecini.getMonth();
    let mIntDay = pDateFecini.getDate();

    /* Obtenemos el día anterior para obtener el costo y stock de ese día */
    let mDateYesterday = pDateFecini.addDay(-1);

    /* Transformamos las fechas a DATETIME, agregandole un día más a la fecha final */
    let mDateTimeFecini = new Ax.util.Date(pDateFecini);
    let mDateTimeFecfin = new Ax.util.Date(pDateFecfin).addDay(1);

    /* Modificamos las tablas y columnas del SQLCOND */
    var mSqlCondGalmvalo = pSqlCond.toString().replace('galmacen.codigo', 'galmvalo.codalm');
    mSqlCondGalmvalo = mSqlCondGalmvalo.toString().replace('glog_stkmov.stkm_codart', 'galmvalo.codart');
    var mSqlCond = pSqlCond.toString().toString().replace('galmacen.codigo', 'glog_stkmov.stkm_codalm');

    /* Variables para el saldo acumulado costo e importe con respecto a un artículo */
    var stockPasado = 0;
    var importePasado = 0;

    var stockPasado1 = 0;
    var importePasado1 = 0;

    var costoPasado = 0;
    var codartPasado = '';

    let mIntSize = 6;
    let auto_increment = 1;

    var mStringPeriodo = mIntYear + '' + (mIntMonth + 1);
    mStringPeriodo = mStringPeriodo.substring(2, 6);

    /* Creamos tabla temporal con los saldos iniciales de un artículo */
    let mTmpTable = Ax.db.getTempTableName(`tmp_opening_balance`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTable}`);
    Ax.db.execute(`
        <select intotemp='${mTmpTable}'>
            <columns>
                galmvalo.codart                                             <alias name='codart' />,
                garticul.nomart                                             <alias name='nomart' />,
                garticul.auxchr1                                            <alias name='principio_activo' />,
                SUBSTR(garticul.webfam, 1, 5)                               <alias name='familia_n2' />,
                garticul.webfam                                             <alias name='familia_n5' />,
                NVL(crp_tipo_existencia.codigo, '99')                       <alias name='tipo_existencia' />,
                CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN 
                        crp_principio_activo.cod_unspsc || '00000000'
                    ELSE '0000000000000000'
                END                                                         <alias name='producto_sunat' />,
                NVL(crp_unimed.codsun, 'NIU')                               <alias name='unimed_sunat' />,
                gart_unimed.nomuni                                          <alias name='unimed' />,
                galmvalo.coste                                              <alias name='costo' />,
                galmvalo.cuenta                                             <alias name='cuenta' />,
                crp_galmacen_equivalente_crpi.codigo_crpi                   <alias name='bodega' />, 
                galmacen.codigo                                             <alias name='codigo_almacen' />,
                gartfami.nomfam                                             <alias name='familia_qs' />,
                crp_familia_flexline.descri                                 <alias name='familia_flex' />,
                crp_tipo_producto.descri                                    <alias name='tipo_producto' />,
                CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                     ELSE 'INAFECTO'
                END                                                         <alias name='afecto_igv' />,
                SUM(galmvalo.stock)                                         <alias name='stock' />,
                (galmvalo.coste * SUM(galmvalo.stock))                      <alias name='importe' />
            </columns>
            <from table='galmvalo'>
                <join table='garticul'>
                    <on>galmvalo.codart = garticul.codigo</on>
                    <join table='garticul_ext'>
                        <on>garticul.codigo = garticul_ext.codigo</on>
                        <join type='left' table='crp_tipo_existencia'>
                            <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                        </join>
                        <join type='left' table='crp_tipo_producto'>
                            <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                        </join>
                    </join>
                    <join type='left' table='crp_principio_activo'>
                        <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                    </join>
                    <join table='gartfami'>
                        <on>garticul.codfam = gartfami.codigo</on>
                    </join>
                    <join type='left' table='crp_familia_flexline'>
                        <on>garticul.webfam = crp_familia_flexline.codigo</on>
                    </join>
                </join>
                <join table='galmacen'>
                    <on>galmvalo.codalm = galmacen.codigo</on>
                    <join type='left' table='crp_galmacen_equivalente_crpi'>
                        <on>galmacen.codigo = crp_galmacen_equivalente_crpi.codalm_axional</on>
                        <on>'GEN_ALMACEN' = crp_galmacen_equivalente_crpi.tipo_maestro</on>
                        <on>crp_galmacen_equivalente_crpi.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                    </join>
                </join>
                <join table='gart_unimed'>
                    <on>galmvalo.coduni = gart_unimed.coduni</on>
                    <join type='left' table='crp_unimed'>
                        <on>gart_unimed.coduni = crp_unimed.codigo</on>
                    </join>
                </join>
            </from>
            <where>
                    ${mSqlCondGalmvalo}
                AND galmvalo.cuenta != 'DEPO' 
                AND galmvalo.fecval = ?
                AND galmvalo.stock &gt; 0
                AND garticul_ext.is_kardex = 'S'
                AND galmacen.auxfec1 NOT IN ('M', 'I')
            </where>
            <group>
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
            </group>
        </select>
    `, mDateYesterday);

    // Rs global con tres bloques Saldos Iniciales, Movimientos de guias y movimientos propios de Axional
    // Orden por Saldos Iniciales, Movimientos y dentro de estos por orden del tipo de documento
    var rsKardex = new Ax.rs.Reader().db(options => {
        options.setResultSet(Ax.db.executeQuery(`
            <union type='all'>
                <!-- --------------------------------------------------------- -->
                <!-- INICIO SELECT SOBRE LOS SALDOS INICIALES DE CADA ARTÍCULO -->
                <!-- --------------------------------------------------------- -->
                <select>
                    <columns>
                        1 <alias name='priori' />,
                        1 <alias name='valord' />,
                        1 <alias name='ordqry' />,
                        TO_CHAR(MDY(${mIntMonth + 1}, ${mIntDay}, ${mIntYear}), '%Y%m00')                                   <alias name='periodo' />,
                        ${mTmpTable}.codart                                                                                 <alias name='producto' />,
                        ${mTmpTable}.nomart                                                                                 <alias name='des_producto' />,
                        ${mTmpTable}.principio_activo                                                                       <alias name='principio_activo' />,
                        ${mTmpTable}.familia_n2                                                                             <alias name='familia_n2' />,
                        ${mTmpTable}.familia_n5                                                                             <alias name='familia_n5' />,
                        ${mTmpTable}.bodega                                                                                 <alias name='bodega' />,
                        ${mTmpTable}.cuenta                                                                                 <alias name='cuenta' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='origen_destino' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='cuenta_destino' />,
                        <cast type='char' size='50'>'SALDOS INICIALES'</cast>                                               <alias name='tipodocto' />,
                        <cast type='integer' >NULL</cast>                                                                   <alias name='correlativo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipologia' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='numero' />,
                        <cast type='char' size='5'>NULL</cast>                                                              <alias name='numeroguia' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_guia_chavin' />,
                        TO_CHAR(MDY(${mIntMonth + 1}, ${mIntDay}, ${mIntYear}), '%d-%m-%Y')                                 <alias name='fecdoc' />,
                        TO_CHAR(MDY(${mIntMonth + 1}, ${mIntDay}, ${mIntYear}), '%H:%M:%S')                                 <alias name='hora' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ruc' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='razon_social' />,
                        '00'                                                                                                <alias name='tipdoc' />,
                        ''                                                                                                  <alias name='serdoc' />,
                        ''                                                                                                  <alias name='nrodoc' />,
                        <cast type='datetime' size='year to second'>NULL</cast>                                             <alias name='fecdoccp' />,
                        ${mTmpTable}.unimed                                                                                 <alias name='unimed' />,
                        ${mTmpTable}.unimed_sunat                                                                           <alias name='unimed_sunat' />,
                        'INGRESO'                                                                                           <alias name='operacion' />,
                        '16'                                                                                                <alias name='tipo_trx' />,
                        'SALDO INICIAL'                                                                                     <alias name='desc_trx'/>,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipo_transferencia' />,
                        ${mTmpTable}.stock                                                                                  <alias name='can_ing' />,
                        ${mTmpTable}.costo                                                                                  <alias name='cos_ing' />,
                        ${mTmpTable}.importe                                                                                <alias name='tot_ing' />,
                        0                                                                                                   <alias name='can_egr' />,
                        0                                                                                                   <alias name='cos_egr' />,
                        0                                                                                                   <alias name='tot_egr' />,
                        ${mTmpTable}.costo                                                                                  <alias name='cos_saldo1' />,
                        ${mTmpTable}.stock                                                                                  <alias name='can_ini' />,
                        ${mTmpTable}.costo                                                                                  <alias name='cos_ini' />,
                        ${mTmpTable}.importe                                                                                <alias name='tot_ini' />,
                        0                                                                                                   <alias name='can_fin' />,
                        0                                                                                                   <alias name='cos_fin' />,
                        0                                                                                                   <alias name='tot_fin' />,
                        ${mTmpTable}.importe                                                                                <alias name='imp_total' />,
                        ${mTmpTable}.stock                                                                                  <alias name='can_total' />,
                        ${mTmpTable}.costo                                                                                  <alias name='costo' />,
                        ${mTmpTable}.afecto_igv                                                                             <alias name='afecto_igv' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='precio' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='porcentajedr' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='precioajustado' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='subtotal' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='igv' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='total' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipdoc_ant' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fecdoc_ant' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='dni_paciente' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nombre_paciente' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='cod_cen_trab' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='des_cen_trab' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='financiador' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipoventa' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='plataforma' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='historia_cli' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_admision' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fec_admision' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fec_alta' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='medico_trata' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='especialidad' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='modalidad_pago' />,
                        ''                                                                                                 <alias name='nro_asiento_declarado' />,
                        '0000'                                                                                              <alias name='cod_establecimiento' />,
                        '9'                                                                                                 <alias name='catalogo' />,
                        ${mTmpTable}.tipo_existencia                                                                        <alias name='tipexist' />,
                        '1'                                                                                                 <alias name='met_val' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_liq' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tip_doc_copago' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ser_doc_copago' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_doc_copago' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fec_doc_copago' />,
                        ${mTmpTable}.tipo_producto                                                                          <alias name='tipo_producto' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='pto_cosumo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='zona' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='desc_zona' />,
                        <cast type='decimal' size='5,3'>NULL</cast>                                                         <alias name='porc_descto' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='prod_chavin' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='cod_procedimiento' />,
                        ${mTmpTable}.producto_sunat                                                                         <alias name='producto_sunat' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='motivo_ajuste' />,
                        'informix'                                                                                          <alias name='cod_user' />,
                        'Informix'                                                                                          <alias name='des_user' />,
                        ${mTmpTable}.familia_qs                                                                             <alias name='familia' />,
                        ${mTmpTable}.familia_flex                                                                           <alias name='sub_familia' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='numeropedido' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='importecoaseguro' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='montocompania' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipopreciofijo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='anyo_chv' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='asien_ch' />,
                        '1'                                                                                                 <alias name='flag_conta' />,
                        ${mTmpTable}.codigo_almacen                                                                         <alias name='codigo_almacen' />,
                        <cast type='date'>MDY(${mIntMonth + 1}, ${mIntDay}, ${mIntYear})</cast>                             <alias name='fecha_orden' />,
                        'galmvalo'                                                                                          <alias name='stkm_tabori' />,
                        0                                                                                                   <alias name='stkm_cabori' />,
                        0                                                                                                   <alias name='stkm_linori' />,
                        <cast type='datetime' size='year to second'>MDY(${mIntMonth + 1}, ${mIntDay}, ${mIntYear})</cast>   <alias name='date_created' />,
                        1 stkm_seqno,
                        1 stkm_canmov,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ctacon_exi' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ctacon_con' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='centro_coste' />
                    </columns>
                    <from table='${mTmpTable}' />
                </select>
                <!-- ------------------------------------------------------ -->
                <!-- FIN SELECT SOBRE LOS SALDOS INICIALES DE CADA ARTÍCULO -->
                <!-- ------------------------------------------------------ -->
                
                <!-- ----------------------------------------------------------------------------- -->
                <!-- INICIO SELECT SOBRE LOS MOVIMIENTOS GENERADOS EN EL AXIONAL POR CADA ARTÍCULO -->
                <!-- ----------------------------------------------------------------------------- -->
                <select>
                    <columns>
                        2 <alias name='priori' />,
                        crp_valstock_get_varlord(
                            geanmovl.linori, 
                            geanmovd.tabori, 
                            geanmovh.tipdoc, 
                            geanmovh.fecmov, 
                            geanmovd.valord,
                            geanmovh.auxnum2) valord,
                        2 <alias name='ordqry' />,
                        TO_CHAR(geanmovh.fecmov, '%Y%m00') <alias name='periodo' />,
                        garticul.codigo                                                                                                 <alias name='producto' />,
                        garticul.nomart                                                                                                 <alias name='des_producto' />,
                        garticul.auxchr1                                                                                                <alias name='principio_activo' />,
                        SUBSTR(garticul.webfam, 1, 5)                                                                                   <alias name='familia_n2' />,
                        garticul.webfam                                                                                                 <alias name='familia_n5' />,
                        equivalente_crpi_stkm.codigo_crpi                                                                               <alias name='bodega' />,
                        glog_stkmov.stkm_cuenta                                                                                         <alias name='cuenta' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'SINT' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'SINT' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TATD' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_des.codigo_crpi
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TATD' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_ori.codigo_crpi
                             WHEN geanmovh.tipdoc IN ('DRDI', 'TRAL', 'RTRA', 'ECFA') AND glog_stkmov.stkm_canmov &gt; 0 THEN equivalente_crpi_ori.codigo_crpi
                             WHEN geanmovh.tipdoc IN ('DRDI', 'TRAL', 'RTRA', 'ECFA') AND glog_stkmov.stkm_canmov &lt; 0 THEN equivalente_crpi_des.codigo_crpi
                             ELSE NULL
                        END <alias name='origen_destino' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'SINT' AND geanmovh.almdes IS NULL THEN 'TRAN'
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'SINT' AND geanmovh.almdes IS NULL THEN 'DISP'
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TATD' AND geanmovh.almdes IS NOT NULL THEN 'DISP'
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TATD' AND geanmovh.almdes IS NOT NULL THEN 'TRAN'
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'ECFA' AND geanmovh.almdes IS NULL THEN 'CDFA'
                             WHEN glog_stkmov.stkm_cuenta = 'CDFA' AND geanmovh.tipdoc = 'ECFA' AND geanmovh.almdes IS NULL THEN 'DISP'
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'ECFA' AND geanmovh.almdes IS NOT NULL THEN 'CDFA'
                             WHEN glog_stkmov.stkm_cuenta = 'CDFA' AND geanmovh.tipdoc = 'ECFA' AND geanmovh.almdes IS NOT NULL THEN 'DISP'
                             WHEN geanmovh.almdes = 'CRP0295F' AND glog_stkmov.stkm_codalm != geanmovh.almdes AND geanmovh.tipdoc = 'DRDI' THEN 'DEVP'
                             WHEN geanmovh.almdes = 'CRP0295F' AND glog_stkmov.stkm_codalm = geanmovh.almdes AND geanmovh.tipdoc = 'DRDI' THEN 'DISP'
                             WHEN geanmovh.tipdoc IN ('TRAL', 'DRDI', 'RTRA') AND glog_stkmov.stkm_canmov &gt; 0 THEN 'DISP'
                             WHEN geanmovh.tipdoc IN ('TRAL', 'DRDI', 'RTRA') AND glog_stkmov.stkm_canmov &lt; 0 THEN 'DISP'
                             WHEN geanmovh.almdes = 'CRP0295F' AND glog_stkmov.stkm_codalm != geanmovh.almdes THEN 'DEVP'
                             WHEN geanmovh.almdes = 'CRP0295F' AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN 'DISP'
                             ELSE NULL
                        END                                                                                                 <alias name='cuenta_destino' />,
                        CASE WHEN geanmovh.tipdoc = 'DRDI' AND gcomalbh.tipdoc = 'AFAR' THEN geanmovd.nomdoc
                             ELSE UPPER(NVL(gcommovd.nomdoc, geanmovd.nomdoc))
                        END                                                                                                 <alias name='tipodocto' />,
                        CASE WHEN geanmovh.tipdoc = 'DRDI' AND gcomalbh.tipdoc = 'AFAR' THEN geanmovh.cabid
                             ELSE NVL(gcomalbh.cabid, geanmovh.cabid)
                        END                                                                                                 <alias name='correlativo' />,
                        CASE WHEN geanmovh.tipdoc = 'DRDI' AND gcomalbh.tipdoc = 'AFAR' THEN geanmovh.tipdoc
                             ELSE NVL(gcomalbh.tipdoc, geanmovh.tipdoc)
                        END                                                                                                 <alias name='tipologia' />,
                        CASE WHEN geanmovh.tipdoc = 'DRDI' AND gcomalbh.tipdoc = 'AFAR' THEN geanmovh.docser
                             ELSE NVL(gcomalbh.docser, geanmovh.docser)
                        END                                                                                                 <alias name='numero' />,
                        <cast type='char' size='5'>NULL</cast> <alias name='numeroguia' />,
                        <cast type='char' size='1'>NULL</cast> nro_guia_chavin,
                        TO_CHAR(geanmovh.fecmov, '%d-%m-%Y') <alias name='fecdoc' />,
                        TO_CHAR(geanmovh.date_created, '%H:%M:%S') <alias name='hora' />,
                        ctercero.cif <alias name='ruc' />,
                        ctercero.nombre <alias name='razon_social' />,
                        CASE WHEN gcomfacl.linid IS NOT NULL THEN '01'
                            WHEN gcomfacl.linid IS NULL AND gcomalbl.linid IS NOT NULL THEN '09'
                            ELSE '00'
                        END <alias name='tipdoc' />,
                        SUBSTR(gcomfach.refter, 0,CHARINDEX('-', gcomfach.refter)-1) <alias name='serdoc' />,
                        SUBSTR(gcomfach.refter, CHARINDEX('-', gcomfach.refter)+1, 8) <alias name='nrodoc' />,
                        CAST(gcomfach.fecha AS DATETIME YEAR TO SECOND) <alias name='fecdoccp' />, <!-- Revisar despues de donde viene la fecha-->
                        gart_unimed.nomuni <alias name='unimed' />,
                        <nvl>crp_unimed.codsun, 'NIU'</nvl> <alias name='unimed_sunat' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN 'INGRESO'
                             ELSE 'EGRESO'
                        END                                                                                                 operacion,
                        CASE WHEN gcomalbl.dtoli1 = 100 THEN '07'
                             ELSE NVL(fach_tipdoc.tsunat, NVL(albh_tipdoc.tsunat, eanh_tipdoc.tsunat))
                        END <alias name='tipo_trx' />,
                        CASE WHEN gcomalbl.dtoli1 = 100 THEN 'BONIFICACIÓN'
                             ELSE NVL(fach_tipdoc.descri, NVL(albh_tipdoc.descri, eanh_tipdoc.descri))
                        END <alias name='desc_trx' />,
                        <cast type='char' size='1'>NULL</cast> tipo_transferencia,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN glog_stkmov.stkm_canmov
                            ELSE 0
                        END <alias name='can_ing' />,
                        CASE WHEN gcomfacl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0)
                            WHEN gcomfacl.linid IS NULL AND gcomalbl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0)
                            WHEN gcomalbl.linid IS NULL AND NVL(geanmovl.impcos,0) IS NOT NULL AND glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0)
                        ELSE 0
                        END <alias name='cos_ing' />,
                        CASE WHEN gcomfacl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &gt; 0 THEN (NVL(geanmovl.impcos,0)*glog_stkmov.stkm_canmov)
                            WHEN gcomfacl.linid IS NULL AND gcomalbl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &gt; 0 THEN (NVL(geanmovl.impcos,0)*glog_stkmov.stkm_canmov)
                            WHEN gcomalbl.linid IS NULL AND NVL(geanmovl.impcos,0) IS NOT NULL AND glog_stkmov.stkm_canmov &gt; 0 THEN (NVL(geanmovl.impcos,0)*glog_stkmov.stkm_canmov)
                        ELSE 0
                        END <alias name='tot_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN (glog_stkmov.stkm_canmov*-1)
                            ELSE 0
                        END <alias name='can_egr' />,
                        CASE WHEN gcomfacl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0)
                            WHEN gcomfacl.linid IS NULL AND gcomalbl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0)
                            WHEN gcomalbl.linid IS NULL AND NVL(geanmovl.impcos,0) IS NOT NULL AND glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0)
                            ELSE 0
                        END <alias name='cos_egr' />,
                        CASE WHEN gcomfacl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &lt; 0 THEN (NVL(geanmovl.impcos,0)*glog_stkmov.stkm_canmov)*-1 
                            WHEN gcomfacl.linid IS NULL AND gcomalbl.linid IS NOT NULL AND glog_stkmov.stkm_canmov &lt; 0 THEN (NVL(geanmovl.impcos,0)*glog_stkmov.stkm_canmov)*-1 
                            WHEN gcomalbl.linid IS NULL AND NVL(geanmovl.impcos,0) IS NOT NULL AND glog_stkmov.stkm_canmov &lt; 0 THEN (NVL(geanmovl.impcos,0)*glog_stkmov.stkm_canmov)*-1 
                            ELSE 0
                        END <alias name='tot_egr' />,
                        CASE WHEN gcomfacl.linid IS NOT NULL THEN NVL(geanmovl.impcos,0)
                            WHEN gcomfacl.linid IS NULL AND gcomalbl.linid IS NOT NULL THEN NVL(geanmovl.impcos,0)
                            WHEN gcomalbl.linid IS NULL AND NVL(geanmovl.impcos,0) IS NOT NULL THEN NVL(geanmovl.impcos,0)
                            ELSE 0
                        END <alias name='cos_saldo1' />,
                        0 can_ini,
                        0 cos_ini,
                        0 tot_ini,
                        0 can_fin,
                        0 cos_fin,
                        0 tot_fin,
                        (NVL(geanmovl.impcos,0)*glog_stkmov.stkm_canmov) <alias name='imp_total' />,
                        glog_stkmov.stkm_canmov <alias name='can_total' />,
                        NVL(geanmovl.impcos,0) <alias name='costo' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                             ELSE 'INAFECTO'
                        END                                                                                                  <alias name='afecto_igv' />,
                        <cast type='decimal' size='22,8'>NULL</cast> precio,
                        <cast type='decimal' size='1'>NULL</cast> porcentajedr,
                        <cast type='decimal' size='1'>NULL</cast> precioajustado,
                        <cast type='decimal' size='1'>NULL</cast> subtotal,
                        <cast type='decimal' size='1'>NULL</cast> igv,
                        <cast type='decimal' size='1'>NULL</cast> total,
                        CASE WHEN geanmovh.tipdoc IN ('TATD', 'TATL') THEN geanmovh.docori
                             END                                                                                            <alias name='tipdoc_ant' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fecdoc_ant' />,
                        <cast type='char' size='1'>NULL</cast> dni_paciente,
                        <cast type='char' size='1'>NULL</cast> nombre_paciente,
                        <cast type='char' size='1'>NULL</cast> cod_cen_trab,
                        <cast type='char' size='1'>NULL</cast> des_cen_trab,
                        <cast type='char' size='1'>NULL</cast> financiador,
                        <cast type='char' size='1'>NULL</cast> idtipoventa,
                        <cast type='char' size='1'>NULL</cast> plataforma,
                        <cast type='char' size='1'>NULL</cast> historia_cli,
                        <cast type='char' size='1'>NULL</cast> nro_admision,
                        <cast type='datetime' size='year to fraction'>NULL</cast> fec_admision,
                        <cast type='datetime' size='year to fraction'>NULL</cast> fec_alta,
                        <cast type='char' size='1'>NULL</cast> medico_trata,
                        <cast type='char' size='1'>NULL</cast> especialidad,
                        <cast type='char' size='1'>NULL</cast> modalidad_pago,
                        NVL(enlaces_factura.nro_asien_ch, enlaces_albaran.nro_asien_ch) <alias name='nro_asiento_declarado' />,
                        '0000' <alias name='cod_establecimiento' />,
                        '9' <alias name='catalogo' />,
                        <nvl>crp_tipo_existencia.codigo, 99</nvl><alias name='tipexist' />,
                        '1' <alias name='met_val' />,
                        <cast type='char' size='1'>NULL</cast> nro_liq,
                        <cast type='char' size='1'>NULL</cast> tip_doc_copago,
                        <cast type='char' size='1'>NULL</cast> ser_doc_copago,
                        <cast type='char' size='1'>NULL</cast> nro_doc_copago,
                        <cast type='datetime' size='year to fraction'>NULL</cast> fec_doc_copago,
                        crp_tipo_producto.descri tipo_producto,
                        <cast type='char' size='1'>NULL</cast> pto_cosumo,
                        <cast type='char' size='1'>NULL</cast> zona,
                        <cast type='char' size='1'>NULL</cast> desc_zona,
                        <cast type='decimal' size='5,3'>NULL</cast> porc_descto,
                        <cast type='char' size='1'>NULL</cast> prod_chavin,
                        <cast type='char' size='1'>NULL</cast> cod_procedimiento,
                        CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN crp_principio_activo.cod_unspsc || '00000000'
                            ELSE '0000000000000000'
                        END <alias name='producto_sunat' />,
                        gdoctype.nomtip motivo_ajuste,
                        NVL(cuserids_fac.usercode, NVL(cuserids_alb.usercode, NVL(cuserids_ean.usercode, 'informix'))) cod_user,
                        NVL(cuserids_fac.username, NVL(cuserids_alb.username, NVL(cuserids_ean.username, 'Informix'))) des_user,
                        gartfami.nomfam familia,
                        crp_familia_flexline.descri sub_familia,
                        <cast type='char' size='1'>NULL</cast> numeropedido,
                        <cast type='decimal' size='22,8'>NULL</cast> importecoaseguro,
                        <cast type='decimal' size='22,8'>NULL</cast> montocompania,
                        <cast type='char' size='1'>NULL</cast> tipopreciofijo,
                        NVL(enlaces_factura.anyo_asien_ch, enlaces_albaran.anyo_asien_ch)                                   <alias name='anyo_chv' />,
                        NVL(enlaces_factura.nro_asien_ch, enlaces_albaran.nro_asien_ch)                                     <alias name='asien_ch' />,
                        CASE WHEN NVL(geanmovh.loteid, 0) + NVL(gcomalbh.loteid, 0) = 0 THEN '0'
                             ELSE '1'
                        END <alias name='flag_conta' />,
                        glog_stkmov.stkm_codalm <alias name='codigo_almacen' />,
                        <cast type='date'>geanmovh.fecmov</cast> <alias name='fecha_orden' />,
                        CASE WHEN gcomalbl.linid IS NOT NULL THEN 'gcomalbh'
                             ELSE glog_stkmov.stkm_tabori
                        END <alias name='stkm_tabori' />,
                        CASE WHEN gcomalbl.linid IS NOT NULL THEN gcomalbl.cabid
                             ELSE glog_stkmov.stkm_cabori
                        END <alias name='stkm_cabori' />,
                        glog_stkmov.stkm_linori,
                        glog_stkmov.date_created,
                        glog_stkmov.stkm_seqno,
                        glog_stkmov.stkm_canmov,
                        NVL(crp_chv_mapcta_albh_exi.ctaori, crp_chv_mapcta_eanh_exi.ctaori)                                                     <alias name='ctacon_exi' />,
                        NVL(crp_chv_mapcta_albh_cos.ctaori, crp_chv_mapcta_eanh_cos.ctaori)                                                     <alias name='ctacon_con' />,
                        NVL(NVL(NVL(NVL(NVL(crp_chv_mapcen_l.cencos, crp_chv_mapcen_g.cencos), crp_chv_mapcen_lh.cencos), crp_chv_mapcen_gh.cencos), crp_chv_mapcen_lh_ean.cencos), crp_chv_mapcen_gh_ean.cencos) <alias name='centro_coste' />
                    </columns>
                    <from table='geanmovh'>
                        <join table='geanmovl'>
                            <on>geanmovh.cabid = geanmovl.cabid</on>
                            <join table='glog_stkmov'>
                                <on>geanmovl.cabid = glog_stkmov.stkm_cabori</on>
                                <on>geanmovl.linid = glog_stkmov.stkm_linori</on>
                                <on>'geanmovh' = glog_stkmov.stkm_tabori</on>
                                <join table='garticul'>
                                    <on>glog_stkmov.stkm_codart = garticul.codigo</on>
                                    <join table='garticul_ext'>
                                        <on>garticul.codigo = garticul_ext.codigo</on>
                                        <join type='left' table='crp_tipo_existencia'>
                                            <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                                        </join>
                                        <join type='left' table='crp_tipo_producto'>
                                            <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                                        </join>
                                    </join>
                                    <join type='left' table='crp_principio_activo'>
                                        <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                                    </join>
                                    <join table='gartfami'>
                                        <on>garticul.codfam = gartfami.codigo</on>
                                    </join>
                                    <join type='left' table='crp_familia_flexline'>
                                        <on>garticul.webfam = crp_familia_flexline.codigo</on>
                                    </join>
                                </join>
                                <join table='gart_unimed'>
                                    <on>glog_stkmov.stkm_uom = gart_unimed.coduni</on>
                                </join>
                                <join type='left' table='crp_unimed'>
                                    <on>gart_unimed.coduni = crp_unimed.codigo</on>
                                </join>
                                <join type='left' table='galmacen' alias='galmacen_stkm'>
                                    <on>glog_stkmov.stkm_codalm = galmacen_stkm.codigo</on>
                                    <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_stkm'>
                                        <on>galmacen_stkm.codigo = equivalente_crpi_stkm.codalm_axional</on>
                                        <on>'GEN_ALMACEN' = equivalente_crpi_stkm.tipo_maestro</on>
                                        <on>equivalente_crpi_stkm.cuenta IN ('DISP', 'CDFA', 'CDCO', 'DEVP')</on>
                                    </join>
                                </join>
                            </join>
                        </join>
                        <join table='geanmovd'>
                            <on>geanmovh.tipdoc = geanmovd.codigo</on>
                            <join type='left' table='gconcuen' alias='gconcuen_eanh_exi'>
                                <on>geanmovd.tipast = gconcuen_eanh_exi.tipast</on>
                                <on>gartfami.tipcon = gconcuen_eanh_exi.codigo</on>
                                <on>gconcuen_eanh_exi.relaci = 'EXI' </on>
                                <on>gconcuen_eanh_exi.placon = 'PE' </on>
                                <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_exi'>
                                    <on>gconcuen_eanh_exi.ctacon = crp_chv_mapcta_eanh_exi.cuenta</on>
                                </join>
                            </join>
                            <join type='left' table='gconcuen' alias='gconcuen_eanh_cos'>
                                <on>geanmovd.tipast = gconcuen_eanh_cos.tipast</on>
                                <on>gartfami.tipcon = gconcuen_eanh_cos.codigo</on>
                                <on>gconcuen_eanh_cos.relaci = 'COS' </on>
                                <on>gconcuen_eanh_cos.placon = 'PE' </on>
                                <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_cos'>
                                    <on>gconcuen_eanh_cos.ctacon = crp_chv_mapcta_eanh_cos.cuenta</on>
                                </join>
                            </join>
                            <join type='left' table='pe_sunat_tipdoc' alias='eanh_tipdoc'>
                                <on>geanmovd.codigo = eanh_tipdoc.tipdoc</on>
                            </join>
                        </join>
                        <join type='left' table='geanmovh_note'>
                            <on>geanmovh.cabid =geanmovh_note.cabid</on>
                            <join type='left' table='gdoctype'>
                                <on>geanmovh_note.tipnot = gdoctype.codigo</on>
                            </join>
                        </join>
                        <join type='left' table='gcomalbh'>
                            <on>geanmovh.docori = gcomalbh.docser</on>
                            <join table='gcomalbl'>
                                <on>gcomalbh.cabid = gcomalbl.cabid</on>
                                <on>geanmovl.codart = gcomalbl.codart</on>
                                <on>geanmovl.canmov = gart_unidefs_get_qtystk(0, gcomalbh.almori, gcomalbl.codart, gcomalbl.varlog, gcomalbl.udmcom, NULL, gcomalbl.canmov, NULL)</on>
                                <on>geanmovl.linori = gcomalbl.linid</on>
                                <join type='left' table='gcomfacl'>
                                    <on>gcomalbl.cabid = gcomfacl.cabori</on>
                                    <on>gcomalbl.linid = gcomfacl.linori</on>
                                    <on>'gcommovh' = gcomfacl.tabori</on>
                                    <join table='gcomfach'>
                                        <on>gcomfacl.cabid = gcomfach.cabid</on>
                                        <on>gcomfach.tipdoc != 'NCFA'</on>
                                        <join table='gcomfacd'>
                                            <on>gcomfach.tipdoc = gcomfacd.codigo</on>
                                            <join type='letf' table='pe_sunat_tipdoc' alias='fach_tipdoc'>
                                                <on>gcomfacd.codigo = fach_tipdoc.tipdoc</on>
                                            </join>
                                        </join>
                                        <join type='left' table='crp_kardex_enlaces' alias='enlaces_factura'>
                                            <on>gcomfach.cabid = enlaces_factura.cabid</on>
                                            <on>gcomfach.loteid = enlaces_factura.loteid</on>
                                            <on>'gcomfach' = enlaces_factura.tabori</on>
                                        </join>
                                        <join type='left' table='cuserids' alias='cuserids_fac'>
                                            <on>gcomfach.user_updated = cuserids_fac.usercode</on>
                                            <on>cuserids_fac.usercode != 'informix'</on>
                                        </join>
                                    </join>
                                </join>
                                <join type='left' table='gcommovl_datc'>
                                    <on>gcomalbl.linid = gcommovl_datc.linid</on>
                                    <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_g'>
                                        <on>gcommovl_datc.seccio = crp_chv_mapcen_g.seccio</on>
                                        <on>crp_chv_mapcen_g.area = 'G'</on>
                                        <on>CAST(crp_chv_mapcen_g.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gcommovl_datc.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                    </join>
                                    <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_l'>
                                        <on>gcommovl_datc.seccio = crp_chv_mapcen_l.seccio</on>
                                        <on>crp_chv_mapcen_l.area = 'L'</on>
                                        <on>CAST(crp_chv_mapcen_l.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gcommovl_datc.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                    </join>
                                </join>
                            </join>
                            <join table='gcommovd'>
                                <on>gcomalbh.tipdoc = gcommovd.codigo</on>
                                <join type='left' table='gconcuen' alias='gconcuen_albh_exi'>
                                    <on>gcommovd.astalb = gconcuen_albh_exi.tipast</on>
                                    <on>gartfami.tipcon = gconcuen_albh_exi.codigo</on>
                                    <on>gconcuen_albh_exi.relaci = 'EXI' </on>
                                    <on>gconcuen_albh_exi.placon = 'PE' </on>
                                    <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_albh_exi'>
                                        <on>gconcuen_albh_exi.ctacon = crp_chv_mapcta_albh_exi.cuenta</on>
                                    </join>
                                </join>
                                <join type='left' table='gconcuen' alias='gconcuen_albh_cos'>
                                    <on>gcommovd.astalb = gconcuen_albh_cos.tipast</on>
                                    <on>gartfami.tipcon = gconcuen_albh_cos.codigo</on>
                                    <on>gconcuen_albh_cos.relaci = 'COS' </on>
                                    <on>gconcuen_albh_cos.placon = 'PE' </on>
                                    <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_albh_cos'>
                                        <on>gconcuen_albh_cos.ctacon = crp_chv_mapcta_albh_cos.cuenta</on>
                                    </join>
                                </join>
                                <join type='left' table='pe_sunat_tipdoc' alias='albh_tipdoc'>
                                    <on>gcommovd.codigo = albh_tipdoc.tipdoc</on>
                                </join>
                            </join>
                            <join table='ctercero'>
                                <on>gcomalbh.tercer = ctercero.codigo</on>
                            </join>
                            <join type='left' table='crp_kardex_enlaces' alias='enlaces_albaran'>
                                <on>gcomalbh.cabid = enlaces_albaran.cabid</on>
                                <on>gcomalbh.loteid = enlaces_albaran.loteid</on>
                                <on>'gcomalbh' = enlaces_albaran.tabori</on>
                            </join>
                            <join type='left' table='cuserids' alias='cuserids_alb'>
                                <on>gcomalbh.user_updated = cuserids_alb.usercode</on>
                                <on>cuserids_alb.usercode != 'informix'</on>
                            </join>
                            <join type='left' table='gdeparta' alias='gdeparta_alb'>
                                <on>gcomalbh.depart = gdeparta_alb.depart</on>
                                <on>gdeparta_alb.delega = 'CRP0'</on>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_gh'>
                                    <on>gdeparta_alb.seccio = crp_chv_mapcen_gh.seccio</on>
                                    <on>crp_chv_mapcen_gh.area = 'G'</on>
                                    <on>CAST(crp_chv_mapcen_gh.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_alb.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                </join>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_lh'>
                                    <on>gdeparta_alb.seccio = crp_chv_mapcen_lh.seccio</on>
                                    <on>crp_chv_mapcen_lh.area = 'L'</on>
                                    <on>CAST(crp_chv_mapcen_gh.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_alb.seccio
                                                                                        AND ccoste.area = 'L')</on>
                                </join>
                            </join>
                        </join>
                        <join table='galmacen' alias='galmacen_ori'>
                            <on>geanmovh.almori = galmacen_ori.codigo</on>
                            <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_ori'>
                                <on>galmacen_ori.codigo = equivalente_crpi_ori.codalm_axional</on>
                                <on>'GEN_ALMACEN' = equivalente_crpi_ori.tipo_maestro</on>
                                <on>equivalente_crpi_ori.cuenta IN ('DISP', 'CDFA', 'CDCO', 'DEVP')</on>
                            </join>
                        </join>
                        <join table='galmacen' type='left' alias='galmacen_des'>
                            <on>geanmovh.almdes = galmacen_des.codigo</on>
                            <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_des'>
                                <on>galmacen_des.codigo = equivalente_crpi_des.codalm_axional</on>
                                <on>'GEN_ALMACEN' = equivalente_crpi_des.tipo_maestro</on>
                                <on>equivalente_crpi_des.cuenta IN ('DISP', 'CDFA', 'CDCO', 'DEVP')</on>
                            </join>
                        </join>
                        <join type='left' table='cuserids' alias='cuserids_ean'>
                            <on>geanmovh.user_updated = cuserids_ean.usercode</on>
                            <on>cuserids_ean.usercode != 'informix'</on>
                        </join>
                        <join type='left' table='gdeparta' alias='gdeparta_ean'>
                            <on>geanmovh.depart = gdeparta_ean.depart</on>
                            <on>gdeparta_ean.delega = 'CRP0'</on>
                            <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_gh_ean'>
                                <on>gdeparta_ean.seccio = crp_chv_mapcen_gh_ean.seccio</on>
                                <on>crp_chv_mapcen_gh_ean.area = 'G'</on>
                                <on>CAST(crp_chv_mapcen_gh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                    FROM crp_chv_mapcen ccoste
                                                                                WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                    AND ccoste.area = 'G')</on>
                            </join>
                            <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_lh_ean'>
                                <on>gdeparta_ean.seccio = crp_chv_mapcen_lh_ean.seccio</on>
                                <on>crp_chv_mapcen_lh_ean.area = 'L'</on>
                                <on>CAST(crp_chv_mapcen_lh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                    FROM crp_chv_mapcen ccoste
                                                                                WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                    AND ccoste.area = 'L')</on>
                            </join>
                        </join>
                    </from>
                    <where>
                        ${mSqlCond} AND
                        geanmovh.auxnum5 != 1 AND  <!-- Flag que viene de CRPI -->
                        garticul_ext.is_kardex = 'S' AND <!-- Flag si el artículo debe estar en el kardex -->
                        galmacen_ori.auxfec1 NOT IN('M', 'I') AND  <!-- Flag de almacen de consignado -->
                        gcomfach.tipdoc NOT IN ('RFAC', 'SFAR') AND <!-- No permite facturas anuladas ni sustitutas -->
                        geanmovh.fecmov BETWEEN ? AND ?
                    </where>
                </select>
                <!-- -------------------------------------------------------------------------- -->
                <!-- FIN SELECT SOBRE LOS MOVIMIENTOS GENERADOS EN EL AXIONAL POR CADA ARTÍCULO -->
                <!-- -------------------------------------------------------------------------- -->
                
                <!-- ------------------------------------------------------------------------- -->
                <!-- INICIO SELECT SOBRE LAS TRANSACCIONES RECIBIDAS POR CRPI DE CADA ARTÍCULO -->
                <!-- ------------------------------------------------------------------------- -->
                <select>
                    <columns>
                        2                                                                                                                                                                                  <alias name='priori' />,
                        crp_valstock_get_varlord(
                            geanmovl.linori, 
                            geanmovd.tabori, 
                            geanmovh.tipdoc, 
                            geanmovh.fecmov, 
                            geanmovd.valord,
                            geanmovh.auxnum2) valord,
                        3 <alias name='ordqry' />,
                        TO_CHAR(geanmovh.fecmov, '%Y%m00')                                                                                                                                                  <alias name='periodo' />,
                        garticul.codigo                                                                                                                                                                     <alias name='producto' />,
                        garticul.nomart                                                                                                                                                                     <alias name='des_producto' />,
                        garticul.auxchr1                                                                                                                                                                    <alias name='principio_activo' />,
                        SUBSTR(garticul.webfam, 1, 5)                                                                                                                                                       <alias name='familia_n2' />,
                        garticul.webfam                                                                                                                                                                     <alias name='familia_n5' />,
                        equivalente_crpi_stkm.codigo_crpi                                                                                                                                                   <alias name='bodega' />,
                        glog_stkmov.stkm_cuenta                                                                                                                                                             <alias name='cuenta' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_des.codigo_crpi
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_ori.codigo_crpi
                             WHEN geanmovh.tipdoc IN ('TRFA', 'TRAL') AND glog_stkmov.stkm_canmov &gt; 0 THEN equivalente_crpi_ori.codigo_crpi
                             WHEN geanmovh.tipdoc IN ('TRFA', 'TRAL') AND glog_stkmov.stkm_canmov &lt; 0 THEN equivalente_crpi_des.codigo_crpi
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='origen_destino' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN 'TRAN'
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN 'DISP'
                             WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN 'DISP'
                             WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN 'TRAN'
                             WHEN geanmovh.tipdoc IN ('TRFA', 'TRAL') AND glog_stkmov.stkm_canmov &gt; 0 THEN 'DISP'
                             WHEN geanmovh.tipdoc IN ('TRFA', 'TRAL') AND glog_stkmov.stkm_canmov &lt; 0 THEN 'DISP'
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='cuenta_destino' />,
                        UPPER(crp_crpi_tipo_guia_interna.tipgi_descripcion_crpi)                                                                                                                            <alias name='tipodocto' />,
                        geanmovh.cabid                                                                                                                                                                      <alias name='correlativo' />,
                        geanmovh.tipdoc                                                                                                                                                                     <alias name='tipologia' />,
                        geanmovh.docser                                                                                                                                                                     <alias name='numero' />,
                        crp_crpi_guia_interna.numeroguia                                                                                                                                                    <alias name='numeroguia' />,
                        crp_chv_ns_kardex_salidas.nro_guia_chavin                                                                                                                                           <alias name='nro_guia_chavin' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%d-%m-%Y')                                                                                                                                <alias name='fecdoc' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%H:%M:%S')                                                                                                                                <alias name='hora' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                        END                                                                                                                                                                                 <alias name='ruc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN NVL(nombrereceptor, '')
                        END                                                                                                                                                                                 <alias name='razon_social' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_tipo = 'B' THEN '03'
                             WHEN crp_chv_ns_kardex_salidas.doc_tipo = 'F' THEN '01' 
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'B' THEN '03'
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'F' THEN '01'
                        ELSE NULL
                        END                                                                                                                                                                                 <alias name='tipdoc' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_serie IS NOT NULL THEN crp_chv_ns_kardex_salidas.doc_serie
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='serdoc' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_correlativo IS NOT NULL THEN crp_chv_ns_kardex_salidas.doc_correlativo
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN crp_crpi_guia_interna.numerocomprobantecopago
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='nrodoc' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_fecha IS NOT NULL THEN <cast type='datetime' size='year to second'>crp_chv_ns_kardex_salidas.doc_fecha</cast>
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN <cast type='datetime' size='year to second'>crp_crpi_guia_interna.fechacomprobantecopago</cast>
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='fecdoccp' />,
                        crp_crpi_guia_interna_detalle.unidadingreso                                                                                                                                         <alias name='unimed' />,
                        NVL(crp_unimed.codsun, 'NIU')                                                                                                                                                       <alias name='unimed_sunat' />,
                        CASE WHEN glog_stkmov.stkm_canmov > 0 THEN 'INGRESO'
                            ELSE 'EGRESO'
                        END                                                                                                                                                                                 <alias name='operacion' />,
                        pe_sunat_tipdoc.tsunat                                                                                                                                                              <alias name='tipo_trx' />,
                        pe_sunat_tipdoc.descri                                                                                                                                                              <alias name='desc_trx' />,
                        crp_crpi_guia_interna.tipotransferencia                                                                                                                                             <alias name='tipo_transferencia' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0)
                            ELSE 0  
                        END                                                                                                                                                                                 <alias name='cos_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN glog_stkmov.stkm_canmov * -1
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='cos_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov * -1
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_egr' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='cos_saldo1' />,
                        0                                                                                                                                                                                   <alias name='can_ini' />,
                        0                                                                                                                                                                                   <alias name='cos_ini' />,
                        0                                                                                                                                                                                   <alias name='tot_ini' />,
                        0                                                                                                                                                                                   <alias name='can_fin' />,
                        0                                                                                                                                                                                   <alias name='cos_fin' />,
                        0                                                                                                                                                                                   <alias name='tot_fin' />,
                        NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov                                                                                                                                    <alias name='imp_total' />,
                        glog_stkmov.stkm_canmov                                                                                                                                                             <alias name='can_total' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='costo' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                             ELSE 'INAFECTO'
                        END                                                                                                  <alias name='afecto_igv' />,
                        crp_crpi_guia_interna_detalle.precio                                                                                                                                                <alias name='precio' />,
                        crp_crpi_guia_interna_detalle.porcentajedr                                                                                                                                          <alias name='porcentajedr' />,
                        crp_crpi_guia_interna_detalle.precioajustado                                                                                                                                        <alias name='precioajustado' />,
                        crp_crpi_guia_interna_detalle.montosubtotal                                                                                                                                         <alias name='subtotal' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN crp_crpi_guia_interna_detalle.montosubtotal * (18/100)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='igv' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN (crp_crpi_guia_interna_detalle.montosubtotal * (18/100) + crp_crpi_guia_interna_detalle.montosubtotal)
                                ELSE crp_crpi_guia_interna_detalle.montosubtotal
                        END                                                                                                                                                                                 <alias name='total' />,
                        CASE WHEN geanmovh.tipdoc IN ('ODEF', 'TREN') THEN geanmovh.refter
                             END                                                                                            <alias name='tipdoc_ant' />,
                        crp_crpi_guia_interna_detalle.numeroguiaorigen                                                      <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fecdoc_ant' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.numerodocumentopaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                             ELSE crp_crpi_guia_interna.numerodocumentopaciente 
                        END <alias name='dni_paciente' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.nombrepaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN NVL(nombrereceptor, '')
                             ELSE crp_crpi_guia_interna.nombrepaciente 
                        END <alias name='nombre_paciente' />,
                        crp_maestro_compania.codigocompania                                                                                                                                                 <alias name='cod_cen_trab' />,
                        REPLACE(crp_maestro_compania.descripcioncompania, ';', ',')                                                                                                                    <alias name='des_cen_trab' />,
                        crp_maestro_financiador.descripcionfinanciador                                                                                                                                      <alias name='financiador' />,
                        crp_maestro_tipo_venta.descripcion                                                                                                                                                  <alias name='tipoventa' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_maestro_tipomodulo.descripcion
                             ELSE 'AMBULATORIO' 
                        END                                                                                                                                                                                 <alias name='plataforma' />,
                        crp_maestro_historiaclinica.codigo                                                                                                                                                  <alias name='historia_cli' />,
                        crp_maestro_admision.codigoadmision                                                                                                                                                 <alias name='nro_admision' />,
                        crp_maestro_admision.fechaingreso                                                                                                                                                   <alias name='fec_admision' />,
                        crp_maestro_admision.fechaaltapaciente                                                                                                                                              <alias name='fec_alta' />,
                        crp_maestro_medico.nombre || ' ' ||crp_maestro_medico.apellidopaterno                                                                                                               <alias name='medico_trata' />,
                        crp_maestro_especialidades.descripcionespecialidad                                                                                                                                  <alias name='especialidad' />,
                        CASE WHEN  crp_crpi_guia_interna.idtipoventa = 3 THEN 'Particulares'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 5 THEN 'Colaboradores'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 2 THEN 'Otros medicos' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 1 THEN 'Medicos accionistas' 
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'       
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'                                
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (23,23)  THEN 'Donaciones'    
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato IN (1,4) THEN 'Particulares' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato NOT IN (1,4) THEN crp_maestro_modalidadfac.descripcionmodalidad  
                             ELSE  crp_maestro_modalidadfac.descripcionmodalidad                       
                         END                                                                                                                                                                                <alias name='modalidad_pago' />,
                        ''                                                                                                                                                                                  <alias name='nro_asiento_declarado' />,
                        '0000'                                                                                                                                                                              <alias name='cod_establecimiento' />,
                        '9'                                                                                                                                                                                 <alias name='catalogo' />,
                        NVL(crp_tipo_existencia.codigo, 99)                                                                                                                                                 <alias name='tipexist' />,
                        '1'                                                                                                                                                                                 <alias name='met_val' />,
                        <cast type='varchar' size='20'>NULL</cast>                                                                                                                                          <alias name='nro_liq' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1)
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='tip_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='ser_doc_copago' />,
                        crp_crpi_guia_interna.numerocomprobantecopago                                                                                                                                       <alias name='nro_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN crp_crpi_guia_interna.fechacomprobantecopago
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='fec_doc_copago' />,
                        crp_tipo_producto.descri                                                                                                                                                            <alias name='tipo_producto' />,
                        almacen_punto_consumo.nomalm                                                                                                                                                        <alias name='pto_cosumo' />,
                        crp_maestro_origenpedido.descripcionorigen                                                                                                                                          <alias name='zona' />,
                        crp_maestro_origenpedido.descripcionequipo                                                                                                                                          <alias name='desc_zona' />,
                        crp_crpi_guia_interna_detalle.porcentajedr                                                                                                                                          <alias name='porc_descto' />,
                        garticul_ext.code_chavin                                                                                                                                                            <alias name='prod_chavin' />,
                        <!-- <alias name='tipo_atencion' /> -->
                        crp_crpi_guia_interna_detalle.codigoprocedimiento                                                                                                                                   <alias name='cod_procedimiento' />,
                        CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN crp_principio_activo.cod_unspsc || '00000000'
                                ELSE '0000000000000000'
                        END                                                                                                                                                                                 <alias name='producto_sunat' />,
                        crp_crpi_guia_interna_detalle.motivoajuste                                                                                                                                          <alias name='motivo_ajuste' />,
                        crp_crpi_guia_interna.codigousuario                                                                                                                                                 <alias name='cod_user' />,
                        crp_crpi_guia_interna.nombreusuario                                                                                                                                                 <alias name='des_user' />,
                        gartfami.nomfam                                                                                                                                                                     <alias name='familia' />,
                        crp_familia_flexline.descri                                                                                                                                                         <alias name='sub_familia' />,
                        crp_crpi_guia_interna.numeropedido                                                                                                                                                  <alias name='numeropedido' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN crp_crpi_guia_interna_detalle.importecoaseguro / 1.18
                             ELSE crp_crpi_guia_interna_detalle.importecoaseguro
                        END                                                                                                                                                                                 <alias name='importecoaseguro' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN crp_crpi_guia_interna_detalle.montocompania /1.18
                             ELSE crp_crpi_guia_interna_detalle.montocompania
                        END                                                                                                                                                                                 <alias name='montocompania' />,
                        crp_crpi_guia_interna_detalle.tipopreciofijo                                                                                                                                        <alias name='tipopreciofijo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='anyo_chv' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='asien_ch' />,
                        CASE WHEN NVL(geanmovh.loteid, 0) = 0 THEN '0'
                             ELSE '1'
                        END                                                                                                                                                                                 <alias name='flag_conta' />,
                        glog_stkmov.stkm_codalm                                                                                                                                                             <alias name='codigo_almacen' />,
                        <cast type='date'>crp_crpi_guia_interna.fechaguia</cast> <alias name='fecha_orden' />,
                        glog_stkmov.stkm_tabori,
                        glog_stkmov.stkm_cabori,
                        glog_stkmov.stkm_linori,
                        glog_stkmov.date_created,
                        glog_stkmov.stkm_seqno,
                        glog_stkmov.stkm_canmov,
                        crp_chv_mapcta_eanh_exi.ctaori                                                                                 <alias name='ctacon_exi' />,
                        crp_chv_mapcta_eanh_cos.ctaori                                                                                 <alias name='ctacon_con' />,
                        NVL(crp_chv_mapcen_lh_ean.cencos, crp_chv_mapcen_gh_ean.cencos)                                                <alias name='centro_coste' />
                    </columns>
                    <from table='glog_stkmov'>
                        <join table='geanmovl'>
                            <on>glog_stkmov.stkm_tabori = 'geanmovh'</on>
                            <on>glog_stkmov.stkm_cabori = geanmovl.cabid</on>
                            <on>glog_stkmov.stkm_linori = geanmovl.linid</on>
                            <join table='crp_crpi_guia_interna_detalle'>
                                <on>'geanmovl' = crp_crpi_guia_interna_detalle.tabdes</on>
                                <on>geanmovl.cabid = crp_crpi_guia_interna_detalle.cabdes</on>
                                <on>geanmovl.linid = crp_crpi_guia_interna_detalle.lindes</on>
                                <join type='left' table='crp_crpi_tipo_guia_interna' alias='tipo_guia_interna_origen'>
                                    <on>crp_crpi_guia_interna_detalle.idtipotransaccionorigen = tipo_guia_interna_origen.tipgi_tipdoc_crpi</on>
                                </join>
                                <join table='crp_crpi_guia_interna'>
                                    <on>crp_crpi_guia_interna_detalle.idguiainterna = crp_crpi_guia_interna.idguiainterna</on>
                                    <join table='crp_crpi_tipo_guia_interna'>
                                        <on>crp_crpi_guia_interna.idtipotransaccion = crp_crpi_tipo_guia_interna.tipgi_tipdoc_crpi</on>
                                    </join>             
                                    <join type='left' table='crp_maestro_tipo_venta'>
                                        <on>crp_crpi_guia_interna.idtipoventa = crp_maestro_tipo_venta.idtipoventa</on>
                                    </join>                      
                                    <join table='geanmovh'>
                                        <on>crp_crpi_guia_interna.tabdes = 'geanmovh'</on>
                                        <on>crp_crpi_guia_interna.cabdes = geanmovh.cabid</on>
                                        <on>crp_crpi_guia_interna.idguiainterna = geanmovh.auxnum4</on>
                                        <join table='galmacen' alias='galmacen_ori'>
                                            <on>geanmovh.almori = galmacen_ori.codigo</on>
                                            <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_ori'>
                                                <on>galmacen_ori.codigo = equivalente_crpi_ori.codalm_axional</on>
                                                <on>'GEN_ALMACEN' = equivalente_crpi_ori.tipo_maestro</on>
                                                <on>equivalente_crpi_ori.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                            </join>
                                        </join>
                                        <join type='left' table='galmacen' alias='galmacen_des'>
                                            <on>geanmovh.almdes = galmacen_des.codigo</on>
                                            <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_des'>
                                                <on>galmacen_des.codigo = equivalente_crpi_des.codalm_axional</on>
                                                <on>'GEN_ALMACEN' = equivalente_crpi_des.tipo_maestro</on>
                                                <on>equivalente_crpi_des.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                            </join>
                                        </join>
                                        <join table='geanmovd'>
                                            <on>geanmovh.tipdoc = geanmovd.codigo</on>
                                            <join type='left' table='gconcuen' alias='gconcuen_eanh_exi'>
                                                <on>geanmovd.tipast = gconcuen_eanh_exi.tipast</on>
                                                <on>gartfami.tipcon = gconcuen_eanh_exi.codigo</on>
                                                <on>gconcuen_eanh_exi.relaci = 'EXI' </on>
                                                <on>gconcuen_eanh_exi.placon = 'PE' </on>
                                                <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_exi'>
                                                    <on>gconcuen_eanh_exi.ctacon = crp_chv_mapcta_eanh_exi.cuenta</on>
                                                </join>
                                            </join>
                                            <join type='left' table='gconcuen' alias='gconcuen_eanh_cos'>
                                                <on>geanmovd.tipast = gconcuen_eanh_cos.tipast</on>
                                                <on>gartfami.tipcon = gconcuen_eanh_cos.codigo</on>
                                                <on>gconcuen_eanh_cos.relaci = 'COS' </on>
                                                <on>gconcuen_eanh_cos.placon = 'PE' </on>
                                                <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_cos'>
                                                    <on>gconcuen_eanh_cos.ctacon = crp_chv_mapcta_eanh_cos.cuenta</on>
                                                </join>
                                            </join>
                                            <join type='left' table='pe_sunat_tipdoc'>
                                                <on>geanmovd.codigo = pe_sunat_tipdoc.tipdoc</on>
                                            </join>
                                        </join>
                                        <join type='left' table='gdeparta' alias='gdeparta_ean'>
                                            <on>geanmovh.depart = gdeparta_ean.depart</on>
                                            <on>gdeparta_ean.delega = 'CRP0'</on>
                                            <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_gh_ean'>
                                                <on>gdeparta_ean.seccio = crp_chv_mapcen_gh_ean.seccio</on>
                                                <on>crp_chv_mapcen_gh_ean.area = 'G'</on>
                                                <on>CAST(crp_chv_mapcen_gh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                                    FROM crp_chv_mapcen ccoste
                                                                                                WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                                    AND ccoste.area = 'G')</on>
                                            </join>
                                            <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_lh_ean'>
                                                <on>gdeparta_ean.seccio = crp_chv_mapcen_lh_ean.seccio</on>
                                                <on>crp_chv_mapcen_lh_ean.area = 'L'</on>
                                                <on>CAST(crp_chv_mapcen_lh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                                    FROM crp_chv_mapcen ccoste
                                                                                                WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                                    AND ccoste.area = 'L')</on>
                                            </join>
                                        </join>
                                    </join>
                                    <join type='left' table='crp_maestro_financiador'>
                                        <on>crp_crpi_guia_interna.idfinanciador = crp_maestro_financiador.idfinanciador</on>
                                    </join>
                                    <join type='left' table='crp_maestro_tipomodulo'>
                                        <on>crp_crpi_guia_interna.codigotipomodulo = crp_maestro_tipomodulo.codigo</on>
                                    </join>
                                    <join type='left' table='crp_maestro_historiaclinica'>
                                        <on>crp_crpi_guia_interna.idhistoriaclinica = crp_maestro_historiaclinica.idhistoriaclinica</on>
                                    </join>
                                    <join type='left' table='crp_maestro_admision'>
                                        <on>crp_crpi_guia_interna.idadmision = crp_maestro_admision.idadmision</on>
                                    </join>
                                    <join type='left' table='crp_maestro_medico'>
                                        <on>crp_crpi_guia_interna.idmedico = crp_maestro_medico.idmedico</on>
                                    </join>
                                    <join type='left' table='crp_maestro_especialidades'>
                                        <on>crp_crpi_guia_interna.idespecialidad = crp_maestro_especialidades.idespecialidad</on>
                                    </join>
                                    <join type='left' table='crp_maestro_modalidadfac'>
                                        <on>crp_crpi_guia_interna.idmodalidadfacturacion = crp_maestro_modalidadfac.idmodalidadfacturacion</on>
                                    </join>
                                    <join type='left' table='crp_maestro_compania'>
                                        <on>crp_crpi_guia_interna.idcompania = crp_maestro_compania.idcompania</on>
                                    </join>
                                    <join type='left' table='crp_maestro_origenpedido'>
                                        <on>crp_crpi_guia_interna.idorigenpedido = crp_maestro_origenpedido.idorigenpedido</on>
                                    </join>
                                    <join type='left' table='crp_galmacen_equivalente_crpi'>
                                        <on>crp_crpi_guia_interna.codigopuntoconsumo = crp_galmacen_equivalente_crpi.codigo_crpi</on>
                                        <on>'FAR_PTOCONSUMO' = crp_galmacen_equivalente_crpi.tipo_maestro</on>
                                        <join type='left' table='galmacen' alias='almacen_punto_consumo'>
                                            <on>crp_galmacen_equivalente_crpi.codalm_axional = almacen_punto_consumo.codigo</on>
                                        </join>
                                    </join>
                                    <join type='left' table='crp_chv_ns_kardex_salidas'>
                                        <on>crp_crpi_guia_interna.idguiainterna = crp_chv_ns_kardex_salidas.cabid_axional</on>
                                        <on>crp_chv_ns_kardex_salidas.tabname = 'guia_interna'</on>
                                    </join>
                                </join>
                            </join>
                            <join table='garticul'>
                                <on>geanmovl.codart = garticul.codigo</on>
                                <join table='garticul_ext'>
                                    <on>garticul.codigo = garticul_ext.codigo</on>
                                    <join type='left' table='crp_tipo_existencia'>
                                        <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                                    </join>
                                    <join type='left' table='crp_tipo_producto'>
                                        <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                                    </join>
                                </join>
                                <join type='left' table='crp_principio_activo'>
                                    <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                                </join>
                                <join table='gartfami'>
                                    <on>garticul.codfam = gartfami.codigo</on>
                                </join>
                                <join type='left' table='crp_familia_flexline'>
                                    <on>garticul.webfam = crp_familia_flexline.codigo</on>
                                </join>
                            </join>
                        </join>
                        <join type='left' table='crp_unimed'>
                            <on>glog_stkmov.stkm_uom = crp_unimed.codigo</on>
                        </join>
                        <join table='galmacen' alias='galmacen_stkm'>
                            <on>glog_stkmov.stkm_codalm = galmacen_stkm.codigo</on>
                            <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_stkm'>
                                <on>galmacen_stkm.codigo = equivalente_crpi_stkm.codalm_axional</on>
                                <on>'GEN_ALMACEN' = equivalente_crpi_stkm.tipo_maestro</on>
                                <on>equivalente_crpi_stkm.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                            </join>
                        </join>
                    </from>
                    <where>
                        ${mSqlCond} AND
                        geanmovh.tipdoc NOT IN ('OECH', 'RECH') AND <!-- Movimientos ya salen en la SELECT de consignados -->
                        crp_crpi_guia_interna.estado IN(1, 2, 5) AND <!-- Estados validos para aparecer -->
                        garticul_ext.is_kardex = 'S' AND <!-- Flag si el artículo debe estar en el kardex -->
                        galmacen_ori.auxfec1 NOT IN ('M', 'I') AND <!-- Flag de almacen de consignado -->
                        crp_crpi_guia_interna.fechaguia BETWEEN ? AND ?
                    </where>
                </select>
                <!-- ---------------------------------------------------------------------- -->
                <!-- FIN SELECT SOBRE LAS TRANSACCIONES RECIBIDAS POR CRPI DE CADA ARTÍCULO -->
                <!-- ---------------------------------------------------------------------- -->
                
                <!-- -------------------------------------------------------------------------------------------- -->
                <!-- INICIO SELECT SOBRE LAS ANULACIONES DE LAS TRANSACCIONES RECIBIDAS POR CRPI DE CADA ARTÍCULO -->
                <!-- -------------------------------------------------------------------------------------------- -->
                <select>
                    <columns>
                        2 <alias name='priori' />,
                        crp_valstock_get_varlord(
                            geanmovl.linori, 
                            geanmovd.tabori, 
                            geanmovh.tipdoc, 
                            geanmovh.fecmov, 
                            geanmovd.valord,
                            geanmovh.auxnum2) valord,
                        4 <alias name='ordqry' />,
                        TO_CHAR(geanmovh.fecmov, '%Y%m00') <alias name='periodo' />,
                        garticul.codigo <alias name='producto' />,
                        garticul.nomart <alias name='des_producto' />,
                        garticul.auxchr1                                                                                                                                                                    <alias name='principio_activo' />,
                        SUBSTR(garticul.webfam, 1, 5)                                                                                                                                                       <alias name='familia_n2' />,
                        garticul.webfam                                                                                                                                                                     <alias name='familia_n5' />,
                        equivalente_crpi_stkm.codigo_crpi                                                                                                                                                   <alias name='bodega' />,
                        glog_stkmov.stkm_cuenta                                                                                                                                                             <alias name='cuenta' />,
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              <alias name='origen_destino' />,
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              <alias name='cuenta_destino' />,
                        UPPER(geanmovd.nomdoc)                                                                                                                                                              tipodocto,
                        geanmovh.cabid                                                                                                                                                                      <alias name='correlativo' />,
                        geanmovh.tipdoc                                                                                                                                                                     <alias name='tipologia' />,
                        geanmovh.docser                                                                                                                                                                     <alias name='numero' />,
                        crp_crpi_guia_interna.numeroguia                                                                                                                                                    <alias name='numeroguia' />,
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              nro_guia_chavin,
                        TO_CHAR(geanmovh.fecmov, '%d-%m-%Y')                                                                                                                                                <alias name='fecdoc' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%H:%M:%S')                                                                                                                                <alias name='hora' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                        END                                                                                                                                                                                 <alias name='ruc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN NVL(nombrereceptor, '')
                        END                                                                                                                                                                                 <alias name='razon_social' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'B' THEN '03'
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'F' THEN '01'
                        ELSE NULL
                        END                                                                                                                                                                                 <alias name='tipdoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='serdoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN crp_crpi_guia_interna.numerocomprobantecopago
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='nrodoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN <cast type='datetime' size='year to second'>crp_crpi_guia_interna.fechacomprobantecopago</cast>
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='fecdoccp' />,
                        gart_unimed.nomuni                                                                                                                                                                  <alias name='unimed' />,
                        <nvl>crp_unimed.codsun, 'NIU'</nvl>                                                                                                                                                 <alias name='unimed_sunat' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN 'INGRESO'
                                ELSE 'EGRESO'
                        END                                                                                                 operacion,
                        eanh_tipdoc.tsunat                                                                                                                                                                  <alias name='tipo_trx' />,
                        eanh_tipdoc.descri                                                                                                                                                                  <alias name='desc_trx' />,
                        crp_crpi_guia_interna.tipotransferencia                                                              tipo_transferencia,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN glog_stkmov.stkm_canmov
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='can_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0)
                            ELSE 0  
                        END                                                                                                                                                                                 <alias name='cos_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN glog_stkmov.stkm_canmov * -1
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='cos_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov * -1
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_egr' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='cos_saldo1' />,
                        0                                                                                                                                                                                   <alias name='can_ini' />,
                        0                                                                                                                                                                                   <alias name='cos_ini' />,
                        0                                                                                                                                                                                   <alias name='tot_ini' />,
                        0                                                                                                                                                                                   <alias name='can_fin' />,
                        0                                                                                                                                                                                   <alias name='cos_fin' />,
                        0                                                                                                                                                                                   <alias name='tot_fin' />,
                        NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov                                                                                                                                    <alias name='imp_total' />,
                        glog_stkmov.stkm_canmov                                                                                                                                                             <alias name='can_total' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='costo' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                             ELSE 'INAFECTO'
                        END                                                                                                  <alias name='afecto_igv' />,
                        <cast type='decimal' size='22,8'>NULL</cast> precio,
                        <cast type='decimal' size='1'>NULL</cast> porcentajedr,
                        <cast type='decimal' size='1'>NULL</cast> precioajustado,
                        <cast type='decimal' size='1'>NULL</cast> subtotal,
                        <cast type='decimal' size='1'>NULL</cast> igv,
                        <cast type='decimal' size='1'>NULL</cast> total,
                        CASE WHEN geanmovh.tipdoc = 'RTRS' THEN geanmovh.refter
                             END                                                                                                                                                                            <alias name='tipdoc_ant' />,
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                                                                                                           <alias name='fecdoc_ant' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.numerodocumentopaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                             ELSE crp_crpi_guia_interna.numerodocumentopaciente 
                        END <alias name='dni_paciente' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.nombrepaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN nombrereceptor
                             ELSE crp_crpi_guia_interna.nombrepaciente 
                        END <alias name='nombre_paciente' />,
                        crp_maestro_compania.codigocompania                                                                                                                                                 <alias name='cod_cen_trab' />,
                        REPLACE(crp_maestro_compania.descripcioncompania, ';', ',')                                                                                                                    <alias name='des_cen_trab' />,
                        crp_maestro_financiador.descripcionfinanciador financiador,
                        crp_maestro_tipo_venta.descripcion idtipoventa,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_maestro_tipomodulo.descripcion
                                ELSE 'AMBULATORIO' 
                        END                                 plataforma,
                        crp_maestro_historiaclinica.codigo                                                                                                                                                  <alias name='historia_cli' />,
                        crp_maestro_admision.codigoadmision                                                                                                                                                 <alias name='nro_admision' />,
                        crp_maestro_admision.fechaingreso                                                                                                                                                   <alias name='fec_admision' />,
                        crp_maestro_admision.fechaaltapaciente,
                         crp_maestro_medico.nombre || ' ' ||crp_maestro_medico.apellidopaterno                                                                                                              <alias name='medico_trata' />,
                        crp_maestro_especialidades.descripcionespecialidad                                                                                                                                  <alias name='especialidad' />,
                        CASE WHEN  crp_crpi_guia_interna.idtipoventa = 3 THEN 'Particulares'  
                                WHEN  crp_crpi_guia_interna.idtipoventa = 5 THEN 'Colaboradores'  
                                WHEN  crp_crpi_guia_interna.idtipoventa = 2 THEN 'Otros medicos' 
                                WHEN  crp_crpi_guia_interna.idtipoventa = 1 THEN 'Medicos accionistas' 
                                WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND crp_crpi_anulacion_guia_interna.idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'
                                WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND crp_crpi_anulacion_guia_interna.idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'
                                WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND crp_crpi_anulacion_guia_interna.idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'       
                                WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND crp_crpi_anulacion_guia_interna.idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'                                
                                WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND crp_crpi_anulacion_guia_interna.idtipotransaccion IN (23,23)  THEN 'Donaciones'    
                                WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato IN (1,4) THEN 'Particulares' 
                                WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato NOT IN (1,4) THEN crp_maestro_modalidadfac.descripcionmodalidad  
                                ELSE  crp_maestro_modalidadfac.descripcionmodalidad                       
                            END                                                                                                                                                                             <alias name='modalidad_pago' />,
                        '' <alias name='nro_asiento_declarado' />,
                        '0000' <alias name='cod_establecimiento' />,
                        '9' <alias name='catalogo' />,
                        <nvl>crp_tipo_existencia.codigo, 99</nvl><alias name='tipexist' />,
                        '1' <alias name='met_val' />,
                        <cast type='char' size='1'>NULL</cast> nro_liq,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='tip_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='ser_doc_copago' />,
                        crp_crpi_guia_interna.numerocomprobantecopago                                                                                                                                       <alias name='nro_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN crp_crpi_guia_interna.fechacomprobantecopago
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='fec_doc_copago' />,
                        crp_tipo_producto.descri tipo_producto,
                        almacen_punto_consumo.nomalm pto_cosumo,
                        crp_maestro_origenpedido.descripcionorigen zona,
                        crp_maestro_origenpedido.descripcionequipo desc_zona,
                        <cast type='decimal' size='5,3'>NULL</cast> porc_descto,
                        garticul_ext.code_chavin prod_chavin,
                        <cast type='char' size='1'>NULL</cast> cod_procedimiento,
                        CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN crp_principio_activo.cod_unspsc || '00000000'
                            ELSE '0000000000000000'
                        END <alias name='producto_sunat' />,
                        <cast type='char' size='1'>NULL</cast> motivo_ajuste,
                        crp_crpi_guia_interna.codigousuario cod_user,
                        crp_crpi_guia_interna.nombreusuario des_user,
                        gartfami.nomfam familia,
                        crp_familia_flexline.descri sub_familia,
                        crp_crpi_guia_interna.numeropedido numeropedido,
                        <cast type='decimal' size='22,8'>NULL</cast> importecoaseguro,
                        <cast type='decimal' size='22,8'>NULL</cast> montocompania,
                        <cast type='char' size='1'>NULL</cast> tipopreciofijo,
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              <alias name='anyo_chv' />,
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              <alias name='asien_ch' />,
                        CASE WHEN NVL(geanmovh.loteid, 0) = 0 THEN '0'
                                ELSE '1'
                        END <alias name='flag_conta' />,
                        glog_stkmov.stkm_codalm <alias name='codigo_almacen' />,
                        <cast type='date'>crp_crpi_anulacion_guia_interna.date_received</cast> <alias name='fecha_orden' />,
                        glog_stkmov.stkm_tabori,
                        glog_stkmov.stkm_cabori,
                        glog_stkmov.stkm_linori,
                        glog_stkmov.date_created,
                        glog_stkmov.stkm_seqno,
                        glog_stkmov.stkm_canmov,
                        crp_chv_mapcta_eanh_exi.ctaori                                                                                 <alias name='ctacon_exi' />,
                        crp_chv_mapcta_eanh_cos.ctaori                                                                                 <alias name='ctacon_con' />,
                        NVL(crp_chv_mapcen_lh_ean.cencos, crp_chv_mapcen_gh_ean.cencos)                                                <alias name='centro_coste' />
                    </columns>
                    <from table='glog_stkmov'>
                        <join table='geanmovl'>
                            <on>glog_stkmov.stkm_cabori = geanmovl.cabid</on>
                            <on>glog_stkmov.stkm_linori = geanmovl.linid</on>
                            <on>glog_stkmov.stkm_tabori = 'geanmovh'</on>
                            <join table='geanmovh'>
                                <on>geanmovl.cabid = geanmovh.cabid</on>
                                <join table='crp_crpi_anulacion_guia_interna'>
                                    <on>geanmovh.cabid = crp_crpi_anulacion_guia_interna.cabdes</on>
                                    <on>geanmovh.auxnum3 = crp_crpi_anulacion_guia_interna.idguiaanulacion</on>
                                    <on>'geanmovh' = crp_crpi_anulacion_guia_interna.tabdes</on>
                                    <on>1 = crp_crpi_anulacion_guia_interna.estado</on>
                                    <join table='crp_crpi_guia_interna'>
                                        <on>crp_crpi_anulacion_guia_interna.idguiainterna = crp_crpi_guia_interna.idguiainterna</on>
                                        <join table='crp_crpi_tipo_guia_interna'>
                                            <on>crp_crpi_guia_interna.idtipotransaccion = crp_crpi_tipo_guia_interna.tipgi_tipdoc_crpi</on>
                                        </join>             
                                        <join type='left' table='crp_maestro_tipo_venta'>
                                            <on>crp_crpi_guia_interna.idtipoventa = crp_maestro_tipo_venta.idtipoventa</on>
                                        </join>
                                        <join type='left' table='crp_maestro_financiador'>
                                            <on>crp_crpi_guia_interna.idfinanciador = crp_maestro_financiador.idfinanciador</on>
                                        </join>
                                        <join type='left' table='crp_maestro_tipomodulo'>
                                            <on>crp_crpi_guia_interna.codigotipomodulo = crp_maestro_tipomodulo.codigo</on>
                                        </join>
                                        <join type='left' table='crp_maestro_historiaclinica'>
                                            <on>crp_crpi_guia_interna.idhistoriaclinica = crp_maestro_historiaclinica.idhistoriaclinica</on>
                                        </join>
                                        <join type='left' table='crp_maestro_admision'>
                                            <on>crp_crpi_guia_interna.idadmision = crp_maestro_admision.idadmision</on>
                                        </join>
                                        <join type='left' table='crp_maestro_medico'>
                                            <on>crp_crpi_guia_interna.idmedico = crp_maestro_medico.idmedico</on>
                                        </join>
                                        <join type='left' table='crp_maestro_especialidades'>
                                            <on>crp_crpi_guia_interna.idespecialidad = crp_maestro_especialidades.idespecialidad</on>
                                        </join>
                                        <join type='left' table='crp_maestro_modalidadfac'>
                                            <on>crp_crpi_guia_interna.idmodalidadfacturacion = crp_maestro_modalidadfac.idmodalidadfacturacion</on>
                                        </join>
                                        <join type='left' table='crp_maestro_compania'>
                                            <on>crp_crpi_guia_interna.idcompania = crp_maestro_compania.idcompania</on>
                                        </join>
                                        <join type='left' table='crp_maestro_origenpedido'>
                                            <on>crp_crpi_guia_interna.idorigenpedido = crp_maestro_origenpedido.idorigenpedido</on>
                                        </join>
                                        <join type='left' table='crp_galmacen_equivalente_crpi'>
                                            <on>crp_crpi_guia_interna.codigopuntoconsumo = crp_galmacen_equivalente_crpi.codigo_crpi</on>
                                            <on>'FAR_PTOCONSUMO' = crp_galmacen_equivalente_crpi.tipo_maestro</on>
                                            <join type='left' table='galmacen' alias='almacen_punto_consumo'>
                                                <on>crp_galmacen_equivalente_crpi.codalm_axional = almacen_punto_consumo.codigo</on>
                                            </join>
                                        </join>
                                    </join>
                                </join>
                                <join table='geanmovd'>
                                    <on>geanmovh.tipdoc = geanmovd.codigo</on>
                                    <join type='left' table='gconcuen' alias='gconcuen_eanh_exi'>
                                        <on>geanmovd.tipast = gconcuen_eanh_exi.tipast</on>
                                        <on>gartfami.tipcon = gconcuen_eanh_exi.codigo</on>
                                        <on>gconcuen_eanh_exi.relaci = 'EXI' </on>
                                        <on>gconcuen_eanh_exi.placon = 'PE' </on>
                                        <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_exi'>
                                            <on>gconcuen_eanh_exi.ctacon = crp_chv_mapcta_eanh_exi.cuenta</on>
                                        </join>
                                    </join>
                                    <join type='left' table='gconcuen' alias='gconcuen_eanh_cos'>
                                        <on>geanmovd.tipast = gconcuen_eanh_cos.tipast</on>
                                        <on>gartfami.tipcon = gconcuen_eanh_cos.codigo</on>
                                        <on>gconcuen_eanh_cos.relaci = 'COS' </on>
                                        <on>gconcuen_eanh_cos.placon = 'PE' </on>
                                        <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_cos'>
                                            <on>gconcuen_eanh_cos.ctacon = crp_chv_mapcta_eanh_cos.cuenta</on>
                                        </join>
                                    </join>
                                    <join type='left' table='pe_sunat_tipdoc' alias='eanh_tipdoc'>
                                        <on>geanmovd.codigo = eanh_tipdoc.tipdoc</on>
                                    </join>
                                </join>
                                <join type='left' table='gdeparta' alias='gdeparta_ean'>
                                    <on>geanmovh.depart = gdeparta_ean.depart</on>
                                    <on>gdeparta_ean.delega = 'CRP0'</on>
                                    <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_gh_ean'>
                                        <on>gdeparta_ean.seccio = crp_chv_mapcen_gh_ean.seccio</on>
                                        <on>crp_chv_mapcen_gh_ean.area = 'G'</on>
                                        <on>CAST(crp_chv_mapcen_gh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                            FROM crp_chv_mapcen ccoste
                                                                                        WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                            AND ccoste.area = 'G')</on>
                                    </join>
                                    <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_lh_ean'>
                                        <on>gdeparta_ean.seccio = crp_chv_mapcen_lh_ean.seccio</on>
                                        <on>crp_chv_mapcen_lh_ean.area = 'L'</on>
                                        <on>CAST(crp_chv_mapcen_lh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                            FROM crp_chv_mapcen ccoste
                                                                                        WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                            AND ccoste.area = 'L')</on>
                                    </join>
                                </join>
                            </join>
                        </join>
                        <join table='garticul'>
                            <on>glog_stkmov.stkm_codart = garticul.codigo</on>
                            <join table='garticul_ext'>
                                <on>garticul.codigo = garticul_ext.codigo</on>
                                <join type='left' table='crp_tipo_existencia'>
                                    <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                                </join>
                                <join type='left' table='crp_tipo_producto'>
                                    <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                                </join>
                            </join>
                            <join type='left' table='crp_principio_activo'>
                                <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                            </join>
                            <join table='gartfami'>
                                <on>garticul.codfam =gartfami.codigo</on>
                            </join>
                            <join type='left' table='crp_familia_flexline'>
                                <on>garticul.webfam =crp_familia_flexline.codigo</on>
                            </join>
                        </join>
                        <join type='left' table='galmacen' alias='galmacen_stkm'>
                            <on>glog_stkmov.stkm_codalm = galmacen_stkm.codigo</on>
                            <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_stkm'>
                                <on>galmacen_stkm.codigo = equivalente_crpi_stkm.codalm_axional</on>
                                <on>'GEN_ALMACEN' = equivalente_crpi_stkm.tipo_maestro</on>
                                <on>equivalente_crpi_stkm.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                            </join>
                        </join>
                            <join table='gart_unimed'>
                            <on>glog_stkmov.stkm_uom = gart_unimed.coduni</on>
                            <join type='left' table='crp_unimed'>
                                <on>gart_unimed.coduni = crp_unimed.codigo</on>
                            </join>
                        </join>
                    </from>
                    <where>
                        ${mSqlCond} AND
                        geanmovh.tipdoc NOT IN ('OECH', 'RECH') AND 
                        geanmovh.auxnum5 = 1 AND
                        garticul_ext.is_kardex = 'S' AND
                        galmacen_stkm.auxfec1 NOT IN('M', 'I') AND <!-- Flag de almacen de consignado -->
                        geanmovh.fecmov BETWEEN ? AND ?
                    </where>
                </select>
                <!-- ----------------------------------------------------------------------------------------- -->
                <!-- FIN SELECT SOBRE LAS ANULACIONES DE LAS TRANSACCIONES RECIBIDAS POR CRPI DE CADA ARTÍCULO -->
                <!-- ----------------------------------------------------------------------------------------- -->
                
                <!-- -------------------------------------------------------------------------------------------------------------- -->
                <!-- INICIO SELECT SOBRE TRANSACCIONES DE CRPI DE MUCHAS CABECERAS (LOS ARTÍCULOS TIENEN DIFERENTES NUMERO DE GUIA) -->
                <!-- -------------------------------------------------------------------------------------------------------------- -->
                <select>
                    <columns>
                        2                                                                                                                                                                                  <alias name='priori' />,
                        crp_valstock_get_varlord(
                            geanmovl.linori, 
                            geanmovd.tabori, 
                            geanmovh.tipdoc, 
                            geanmovh.fecmov, 
                            geanmovd.valord,
                            geanmovh.auxnum2) valord,
                        5 <alias name='ordqry' />,
                        TO_CHAR(geanmovh.fecmov, '%Y%m00')                                                                                                                                                  <alias name='periodo' />,
                        garticul.codigo                                                                                                                                                                     <alias name='producto' />,
                        garticul.nomart                                                                                                                                                                     <alias name='des_producto' />,
                        garticul.auxchr1                                                                                                                                                                    <alias name='principio_activo' />,
                        SUBSTR(garticul.webfam, 1, 5)                                                                                                                                                       <alias name='familia_n2' />,
                        garticul.webfam                                                                                                                                                                     <alias name='familia_n5' />,
                        equivalente_crpi_stkm.codigo_crpi                                                                                                                                                   <alias name='bodega' />,
                        glog_stkmov.stkm_cuenta                                                                                                                                                             <alias name='cuenta' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_des.codigo_crpi
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_ori.codigo_crpi
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='origen_destino' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN 'TRAN'
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN 'DISP'
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN 'DISP'
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN 'TRAN'
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='cuenta_destino' />,
                        UPPER(crp_crpi_tipo_guia_interna.tipgi_descripcion_crpi)                                                                                                                            <alias name='tipodocto' />,
                        geanmovh.cabid                                                                                                                                                                      <alias name='correlativo' />,
                        geanmovh.tipdoc                                                                                                                                                                     <alias name='tipologia' />,
                        geanmovh.docser                                                                                                                                                                     <alias name='numero' />,
                        crp_crpi_guia_interna.numeroguia                                                                                                                                                    <alias name='numeroguia' />,
                        crp_chv_ns_kardex_salidas.nro_guia_chavin                                                                                                                                           <alias name='nro_guia_chavin' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%d-%m-%Y')                                                                                                                                <alias name='fecdoc' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%H:%M:%S')                                                                                                                                <alias name='hora' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                        END                                                                                                 <alias name='ruc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN NVL(nombrereceptor, '')
                        END                                                                                                 <alias name='razon_social' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_tipo = 'B' THEN '03'
                             WHEN crp_chv_ns_kardex_salidas.doc_tipo = 'F' THEN '01' 
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'B' THEN '03'
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'F' THEN '01'
                        ELSE NULL
                        END                                                                                                                                                                                 <alias name='tipdoc' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_serie IS NOT NULL THEN crp_chv_ns_kardex_salidas.doc_serie
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='serdoc' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_correlativo IS NOT NULL THEN crp_chv_ns_kardex_salidas.doc_correlativo
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN crp_crpi_guia_interna.numerocomprobantecopago
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='nrodoc' />,
                        CASE WHEN crp_chv_ns_kardex_salidas.doc_fecha IS NOT NULL THEN <cast type='datetime' size='year to second'>crp_chv_ns_kardex_salidas.doc_fecha</cast>
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN <cast type='datetime' size='year to second'>crp_crpi_guia_interna.fechacomprobantecopago</cast>
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='fecdoccp' />,
                        crp_crpi_guia_interna_detalle.unidadingreso                                                                                                                                         <alias name='unimed' />,
                        NVL(crp_unimed.codsun, 'NIU')                                                                                                                                                       <alias name='unimed_sunat' />,
                        CASE WHEN glog_stkmov.stkm_canmov > 0 THEN 'INGRESO'
                            ELSE 'EGRESO'
                        END                                                                                                                                                                                 <alias name='operacion' />,
                        pe_sunat_tipdoc.tsunat                                                                                                                                                              <alias name='tipo_trx' />,
                        pe_sunat_tipdoc.descri                                                                                                                                                              <alias name='desc_trx' />,
                        crp_crpi_guia_interna.tipotransferencia                                                                                                                                             <alias name='tipo_transferencia' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0)
                            ELSE 0  
                        END                                                                                                                                                                                 <alias name='cos_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN glog_stkmov.stkm_canmov * -1
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='cos_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov * -1
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_egr' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='cos_saldo1' />,
                        0                                                                                                                                                                                   <alias name='can_ini' />,
                        0                                                                                                                                                                                   <alias name='cos_ini' />,
                        0                                                                                                                                                                                   <alias name='tot_ini' />,
                        0                                                                                                                                                                                   <alias name='can_fin' />,
                        0                                                                                                                                                                                   <alias name='cos_fin' />,
                        0                                                                                                                                                                                   <alias name='tot_fin' />,
                        NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov                                                                                                                                    <alias name='imp_total' />,
                        glog_stkmov.stkm_canmov                                                                                                                                                             <alias name='can_total' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='costo' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                             ELSE 'INAFECTO'
                        END                                                                                                  <alias name='afecto_igv' />,
                        crp_crpi_guia_interna_detalle.precio                                                                                                                                                <alias name='precio' />,
                        crp_crpi_guia_interna_detalle.porcentajedr                                                                                                                                          <alias name='porcentajedr' />,
                        crp_crpi_guia_interna_detalle.precioajustado                                                                                                                                        <alias name='precioajustado' />,
                        crp_crpi_guia_interna_detalle.montosubtotal                                                                                                                                         <alias name='subtotal' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN crp_crpi_guia_interna_detalle.montosubtotal * (18/100)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='igv' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN (crp_crpi_guia_interna_detalle.montosubtotal * (18/100) + crp_crpi_guia_interna_detalle.montosubtotal)
                                ELSE crp_crpi_guia_interna_detalle.montosubtotal
                        END                                                                                                                                                                                 <alias name='total' />,
                        CASE WHEN geanmovh.tipdoc = 'ODEF' THEN geanmovh.refter
                             END                                                                                            <alias name='tipdoc_ant' />,
                        crp_crpi_guia_interna_detalle.numeroguiaorigen                                                      <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fecdoc_ant' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.numerodocumentopaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                             ELSE crp_crpi_guia_interna.numerodocumentopaciente 
                        END <alias name='dni_paciente' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.nombrepaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN nombrereceptor
                             ELSE crp_crpi_guia_interna.nombrepaciente 
                        END <alias name='nombre_paciente' />,
                        crp_maestro_compania.codigocompania                                                                                                                                                 <alias name='cod_cen_trab' />,
                        REPLACE(crp_maestro_compania.descripcioncompania, ';', ',')                                                                                                                    <alias name='des_cen_trab' />,
                        crp_maestro_financiador.descripcionfinanciador                                                                                                                                      <alias name='financiador' />,
                        crp_maestro_tipo_venta.descripcion                                                                                                                                                  <alias name='tipoventa' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_maestro_tipomodulo.descripcion
                             ELSE 'AMBULATORIO' 
                        END                                                                                                                                                                                 <alias name='plataforma' />,
                        crp_maestro_historiaclinica.codigo                                                                                                                                                  <alias name='historia_cli' />,
                        crp_maestro_admision.codigoadmision                                                                                                                                                 <alias name='nro_admision' />,
                        crp_maestro_admision.fechaingreso                                                                                                                                                   <alias name='fec_admision' />,
                        crp_maestro_admision.fechaaltapaciente                                                                                                                                              <alias name='fec_alta' />,
                        crp_maestro_medico.nombre || ' ' ||crp_maestro_medico.apellidopaterno                                                                                                               <alias name='medico_trata' />,
                        crp_maestro_especialidades.descripcionespecialidad                                                                                                                                  <alias name='especialidad' />,
                        CASE WHEN  crp_crpi_guia_interna.idtipoventa = 3 THEN 'Particulares'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 5 THEN 'Colaboradores'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 2 THEN 'Otros medicos' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 1 THEN 'Medicos accionistas' 
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'                             
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'                              
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (23,23)  THEN 'Donaciones'    
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato IN (1,4) THEN 'Particulares' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato NOT IN (1,4) THEN crp_maestro_modalidadfac.descripcionmodalidad  
                             ELSE  crp_maestro_modalidadfac.descripcionmodalidad                       
                         END                                                                                                                                                                                <alias name='modalidad_pago' />,
                        ''                                                                                                                                                                     <alias name='nro_asiento_declarado' />,
                        '0000'                                                                                                                                                                              <alias name='cod_establecimiento' />,
                        '9'                                                                                                                                                                                 <alias name='catalogo' />,
                        NVL(crp_tipo_existencia.codigo, 99)                                                                                                                                                 <alias name='tipexist' />,
                        '1'                                                                                                                                                                                 <alias name='met_val' />,
                        <cast type='varchar' size='20'>NULL</cast>                                                                                                                                          <alias name='nro_liq' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='tip_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='ser_doc_copago' />,
                        crp_crpi_guia_interna.numerocomprobantecopago                                                                                                                                       <alias name='nro_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN crp_crpi_guia_interna.fechacomprobantecopago
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='fec_doc_copago' />,
                        crp_tipo_producto.descri                                                                                                                                                            <alias name='tipo_producto' />,
                        almacen_punto_consumo.nomalm                                                                                                                                                        <alias name='pto_cosumo' />,
                        crp_maestro_origenpedido.descripcionorigen                                                                                                                                          <alias name='zona' />,
                        crp_maestro_origenpedido.descripcionequipo                                                                                                                                          <alias name='desc_zona' />,
                        crp_crpi_guia_interna_detalle.porcentajedr                                                                                                                                          <alias name='porc_descto' />,
                        garticul_ext.code_chavin                                                                                                                                                            <alias name='prod_chavin' />,
                        <!-- <alias name='tipo_atencion' /> -->
                        crp_crpi_guia_interna_detalle.codigoprocedimiento                                                                                                                                   <alias name='cod_procedimiento' />,
                        CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN crp_principio_activo.cod_unspsc || '00000000'
                                ELSE '0000000000000000'
                        END                                                                                                                                                                                 <alias name='producto_sunat' />,
                        crp_crpi_guia_interna_detalle.motivoajuste                                                                                                                                          <alias name='motivo_ajuste' />,
                        crp_crpi_guia_interna.codigousuario                                                                                                                                                 <alias name='cod_user' />,
                        crp_crpi_guia_interna.nombreusuario                                                                                                                                                 <alias name='des_user' />,
                        gartfami.nomfam                                                                                                                                                                    <alias name='familia' />,
                        crp_familia_flexline.descri                                                                                                                                                         <alias name='sub_familia' />,
                        crp_crpi_guia_interna.numeropedido                                                                                                                                                  <alias name='numeropedido' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN crp_crpi_guia_interna_detalle.importecoaseguro / 1.18
                             ELSE crp_crpi_guia_interna_detalle.importecoaseguro
                        END                                                                                                                                                                                 <alias name='importecoaseguro' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN crp_crpi_guia_interna_detalle.montocompania /1.18
                             ELSE crp_crpi_guia_interna_detalle.montocompania
                        END                                                                                                                                                                                 <alias name='montocompania' />,
                        crp_crpi_guia_interna_detalle.tipopreciofijo                                                                                                                                        <alias name='tipopreciofijo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='anyo_chv' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='asien_ch' />,
                        CASE WHEN NVL(geanmovh.loteid, 0) = 0 THEN '0'
                                ELSE '1'
                        END                                                                                                                                                                                 <alias name='flag_conta' />,
                        glog_stkmov.stkm_codalm                                                                                                                                                             <alias name='codigo_almacen' />,
                        <cast type='date'>crp_crpi_guia_interna.fechaguia</cast> <alias name='fecha_orden' />,
                        glog_stkmov.stkm_tabori,
                        glog_stkmov.stkm_cabori,
                        glog_stkmov.stkm_linori,
                        glog_stkmov.date_created,
                        glog_stkmov.stkm_seqno,
                        glog_stkmov.stkm_canmov,
                        crp_chv_mapcta_eanh_exi.ctaori                                                                              <alias name='ctacon_exi' />,
                        crp_chv_mapcta_eanh_cos.ctaori                                                                              <alias name='ctacon_con' />,
                        NVL(crp_chv_mapcen_lh_ean.cencos, crp_chv_mapcen_gh_ean.cencos) centro_coste
                    </columns>
                    <from table='geanmovl'>
                        <join table='geanmovh'>
                            <on>geanmovl.cabid = geanmovh.cabid</on>
                            <join table='geanmovd'>
                                <on>geanmovh.tipdoc = geanmovd.codigo</on>
                                <join type='left' table='gconcuen' alias='gconcuen_eanh_exi'>
                                    <on>geanmovd.tipast = gconcuen_eanh_exi.tipast</on>
                                    <on>gartfami.tipcon = gconcuen_eanh_exi.codigo</on>
                                    <on>gconcuen_eanh_exi.relaci = 'EXI' </on>
                                    <on>gconcuen_eanh_exi.placon = 'PE' </on>
                                    <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_exi'>
                                        <on>gconcuen_eanh_exi.ctacon = crp_chv_mapcta_eanh_exi.cuenta</on>
                                    </join>
                                </join>
                                <join type='left' table='gconcuen' alias='gconcuen_eanh_cos'>
                                    <on>geanmovd.tipast = gconcuen_eanh_cos.tipast</on>
                                    <on>gartfami.tipcon = gconcuen_eanh_cos.codigo</on>
                                    <on>gconcuen_eanh_cos.relaci = 'COS' </on>
                                    <on>gconcuen_eanh_cos.placon = 'PE' </on>
                                    <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_cos'>
                                        <on>gconcuen_eanh_cos.ctacon = crp_chv_mapcta_eanh_cos.cuenta</on>
                                    </join>
                                </join>
                                <join type='left' table='pe_sunat_tipdoc'>
                                    <on>geanmovd.codigo = pe_sunat_tipdoc.tipdoc</on>
                                </join>
                            </join>
                            <join table='galmacen' alias='galmacen_ori'>
                                <on>geanmovh.almori = galmacen_ori.codigo</on>
                                <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_ori'>
                                    <on>galmacen_ori.codigo = equivalente_crpi_ori.codalm_axional</on>
                                    <on>'GEN_ALMACEN' = equivalente_crpi_ori.tipo_maestro</on>
                                    <on>equivalente_crpi_ori.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                </join>
                            </join>
                            <join table='galmacen' type='left' alias='galmacen_des'>
                                <on>geanmovh.almdes = galmacen_des.codigo</on>
                                <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_des'>
                                    <on>galmacen_des.codigo = equivalente_crpi_des.codalm_axional</on>
                                    <on>'GEN_ALMACEN' = equivalente_crpi_des.tipo_maestro</on>
                                    <on>equivalente_crpi_des.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                </join>
                            </join>
                            <join type='left' table='gdeparta' alias='gdeparta_ean'>
                                <on>geanmovh.depart = gdeparta_ean.depart</on>
                                <on>gdeparta_ean.delega = 'CRP0'</on>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_gh_ean'>
                                    <on>gdeparta_ean.seccio = crp_chv_mapcen_gh_ean.seccio</on>
                                    <on>crp_chv_mapcen_gh_ean.area = 'G'</on>
                                    <on>CAST(crp_chv_mapcen_gh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                </join>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_lh_ean'>
                                    <on>gdeparta_ean.seccio = crp_chv_mapcen_lh_ean.seccio</on>
                                    <on>crp_chv_mapcen_lh_ean.area = 'L'</on>
                                    <on>CAST(crp_chv_mapcen_lh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                        AND ccoste.area = 'L')</on>
                                </join>
                            </join>
                        </join>
                        <join table='crp_crpi_guia_interna_detalle'>
                            <on>geanmovl.cabid = crp_crpi_guia_interna_detalle.cabdes</on>
                            <on>geanmovl.linid = crp_crpi_guia_interna_detalle.lindes</on>
                            <on>'geanmovl' = crp_crpi_guia_interna_detalle.tabdes</on>
                            <join type='left' table='crp_crpi_tipo_guia_interna' alias='tipo_guia_interna_origen'>
                                <on>crp_crpi_guia_interna_detalle.idtipotransaccionorigen = tipo_guia_interna_origen.tipgi_tipdoc_crpi</on>
                            </join>
                            <join table='crp_crpi_guia_interna'>
                                <on>crp_crpi_guia_interna_detalle.idguiainterna = crp_crpi_guia_interna.idguiainterna</on>
                                <on>crp_crpi_guia_interna.cabdes = -1</on>
                                <on>crp_crpi_guia_interna.estado IN(1, 2, 5)</on>
                                <join table='crp_crpi_tipo_guia_interna'>
                                    <on>crp_crpi_guia_interna.idtipotransaccion = crp_crpi_tipo_guia_interna.tipgi_tipdoc_crpi</on>
                                </join>
                                <join type='left' table='crp_maestro_tipo_venta'>
                                    <on>crp_crpi_guia_interna.idtipoventa = crp_maestro_tipo_venta.idtipoventa</on>
                                </join>                                  
                                <join type='left' table='crp_maestro_financiador'>
                                    <on>crp_crpi_guia_interna.idfinanciador = crp_maestro_financiador.idfinanciador</on>
                                </join>
                                <join type='left' table='crp_maestro_tipomodulo'>
                                    <on>crp_crpi_guia_interna.codigotipomodulo = crp_maestro_tipomodulo.codigo</on>
                                </join>
                                <join type='left' table='crp_maestro_historiaclinica'>
                                    <on>crp_crpi_guia_interna.idhistoriaclinica = crp_maestro_historiaclinica.idhistoriaclinica</on>
                                </join>
                                <join type='left' table='crp_maestro_admision'>
                                    <on>crp_crpi_guia_interna.idadmision = crp_maestro_admision.idadmision</on>
                                </join>
                                <join type='left' table='crp_maestro_medico'>
                                    <on>crp_crpi_guia_interna.idmedico = crp_maestro_medico.idmedico</on>
                                </join>
                                <join type='left' table='crp_maestro_especialidades'>
                                    <on>crp_crpi_guia_interna.idespecialidad = crp_maestro_especialidades.idespecialidad</on>
                                </join>
                                <join type='left' table='crp_maestro_modalidadfac'>
                                    <on>crp_crpi_guia_interna.idmodalidadfacturacion = crp_maestro_modalidadfac.idmodalidadfacturacion</on>
                                </join>
                                <join type='left' table='crp_maestro_compania'>
                                    <on>crp_crpi_guia_interna.idcompania = crp_maestro_compania.idcompania</on>
                                </join>
                                <join type='left' table='crp_maestro_origenpedido'>
                                    <on>crp_crpi_guia_interna.idorigenpedido = crp_maestro_origenpedido.idorigenpedido</on>
                                </join>
                                <join type='left' table='crp_galmacen_equivalente_crpi'>
                                    <on>crp_crpi_guia_interna.codigopuntoconsumo = crp_galmacen_equivalente_crpi.codigo_crpi</on>
                                    <on>'FAR_PTOCONSUMO' = crp_galmacen_equivalente_crpi.tipo_maestro</on>
                                    <join type='left' table='galmacen' alias='almacen_punto_consumo'>
                                        <on>crp_galmacen_equivalente_crpi.codalm_axional = almacen_punto_consumo.codigo</on>
                                    </join>
                                </join>
                                <join type='left' table='crp_chv_ns_kardex_salidas'>
                                    <on>crp_crpi_guia_interna.idguiainterna = crp_chv_ns_kardex_salidas.cabid_axional</on>
                                    <on>crp_chv_ns_kardex_salidas.tabname = 'guia_interna'</on>
                                </join>
                            </join>
                        </join>
                        <join table='glog_stkmov'>
                            <on>geanmovl.linid = glog_stkmov.stkm_linori</on>
                            <on>geanmovl.cabid = glog_stkmov.stkm_cabori</on>
                            <on>'geanmovh' = glog_stkmov.stkm_tabori</on>
                            <join type='left' table='crp_unimed'>
                                <on>glog_stkmov.stkm_uom = crp_unimed.codigo</on>
                            </join>
                            <join table='galmacen' alias='galmacen_stkm'>
                                <on>glog_stkmov.stkm_codalm = galmacen_stkm.codigo</on>
                                <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_stkm'>
                                    <on>galmacen_stkm.codigo = equivalente_crpi_stkm.codalm_axional</on>
                                    <on>'GEN_ALMACEN' = equivalente_crpi_stkm.tipo_maestro</on>
                                    <on>equivalente_crpi_stkm.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                </join>
                            </join>
                        </join>
                        <join table='garticul'>
                            <on>geanmovl.codart = garticul.codigo</on>
                            <join table='garticul_ext'>
                                <on>garticul.codigo = garticul_ext.codigo</on>
                                <join type='left' table='crp_tipo_existencia'>
                                    <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                                </join>
                                <join type='left' table='crp_tipo_producto'>
                                    <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                                </join>
                            </join>
                            <join type='left' table='crp_principio_activo'>
                                <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                            </join>
                            <join table='gartfami'>
                                <on>garticul.codfam = gartfami.codigo</on>
                            </join>
                            <join type='left' table='crp_familia_flexline'>
                                <on>garticul.webfam = crp_familia_flexline.codigo</on>
                            </join>
                        </join>
                    </from>
                    <where>
                        ${mSqlCond} AND
                        geanmovh.tipdoc NOT IN ('OECH', 'RECH') AND
                        garticul_ext.is_kardex = 'S' AND
                        galmacen_ori.auxfec1 NOT IN ('M', 'I') AND
                        crp_crpi_guia_interna.fechaguia BETWEEN ? AND ?
                    </where>
                </select>
                <!-- ----------------------------------------------------------------------------------------------------------- -->
                <!-- FIN SELECT SOBRE TRANSACCIONES DE CRPI DE MUCHAS CABECERAS (LOS ARTÍCULOS TIENEN DIFERENTES NUMERO DE GUIA) -->
                <!-- ----------------------------------------------------------------------------------------------------------- -->
                
                <!-- -------------------------------------------------------------------------------------------------------------- -->
                <!-- INICIO DOS SELECT SOBRE LOS MOVIMENTOS DE TRANSACCION DE CONSIGNADOS QUE AFECTEN A ALMACENES DE NO CONSIGNADOS -->
                <!-- -------------------------------------------------------------------------------------------------------------- -->
                <select>
                    <columns>
                        2                                                                                                                                                                                  <alias name='priori' />,
                        crp_valstock_get_varlord(
                            geanmovl.linori, 
                            geanmovd.tabori, 
                            geanmovh.tipdoc, 
                            geanmovh.fecmov, 
                            geanmovd.valord,
                            geanmovh.auxnum2) valord,
                        6 <alias name='ordqry' />,
                        TO_CHAR(geanmovh.fecmov, '%Y%m00')                                                                                                                                                  <alias name='periodo' />,
                        garticul.codigo                                                                                                                                                                     <alias name='producto' />,
                        garticul.nomart                                                                                                                                                                     <alias name='des_producto' />,
                        garticul.auxchr1                                                                                                                                                                    <alias name='principio_activo' />,
                        SUBSTR(garticul.webfam, 1, 5)                                                                                                                                                       <alias name='familia_n2' />,
                        garticul.webfam                                                                                                                                                                     <alias name='familia_n5' />,
                        equivalente_crpi_stkm.codigo_crpi                                                                                                                                                   <alias name='bodega' />,
                        glog_stkmov.stkm_cuenta                                                                                                                                                             <alias name='cuenta' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN equivalente_crpi_stkm.codigo_crpi
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_des.codigo_crpi
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN equivalente_crpi_ori.codigo_crpi
                                WHEN geanmovh.tipdoc IN ('TRAL', 'RTRA') AND glog_stkmov.stkm_canmov &gt; 0 THEN equivalente_crpi_ori.codigo_crpi
                                WHEN geanmovh.tipdoc IN ('TRAL', 'RTRA') AND glog_stkmov.stkm_canmov &lt; 0 THEN equivalente_crpi_des.codigo_crpi
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='origen_destino' />,
                        CASE WHEN glog_stkmov.stkm_codalm = geanmovh.almori AND glog_stkmov.stkm_codalm = geanmovh.almdes THEN NULL 
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN 'TRAN'
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TRSA' AND geanmovh.almdes IS NULL THEN 'DISP'
                                WHEN glog_stkmov.stkm_cuenta = 'TRAN' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN 'DISP'
                                WHEN glog_stkmov.stkm_cuenta = 'DISP' AND geanmovh.tipdoc = 'TREN' AND geanmovh.almdes IS NOT NULL THEN 'TRAN'
                                WHEN geanmovh.tipdoc IN ('TRAL', 'RTRA') AND glog_stkmov.stkm_canmov &gt; 0 THEN 'DISP'
                                WHEN geanmovh.tipdoc IN ('TRAL', 'RTRA') AND glog_stkmov.stkm_canmov &lt; 0 THEN 'DISP'
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='cuenta_destino' />,
                        UPPER(geanmovd.nomdoc)                                                                                                                                                              <alias name='tipodocto' />,
                        geanmovh.cabid                                                                                                                                                                      <alias name='correlativo' />,
                        geanmovh.tipdoc                                                                                                                                                                     <alias name='tipologia' />,
                        geanmovh.docser                                                                                                                                                                     <alias name='numero' />,
                        crp_crpi_guia_interna.numeroguia                                                                                                                                                    <alias name='numeroguia' />,
                        <cast type='varchar' size='10'>NULL</cast>                                                                                                                                          <alias name='nro_guia_chavin' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%d-%m-%Y')                                                                                                                                <alias name='fecdoc' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%H:%M:%S')                                                                                                                                <alias name='hora' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                        END                                                                                                 <alias name='ruc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN NVL(nombrereceptor, '')
                        END                                                                                                 <alias name='razon_social' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'B' THEN '03'
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'F' THEN '01'
                        ELSE NULL
                        END                                                                                                                                                                                 <alias name='tipdoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='serdoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN crp_crpi_guia_interna.numerocomprobantecopago
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='nrodoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN <cast type='datetime' size='year to second'>crp_crpi_guia_interna.fechacomprobantecopago</cast>
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='fecdoccp' />,
                        gart_unimed.nomuni                                                                                                                                                                  <alias name='unimed' />,
                        NVL(crp_unimed.codsun, 'NIU')                                                                                                                                                       <alias name='unimed_sunat' />,
                        CASE WHEN glog_stkmov.stkm_canmov > 0 THEN 'INGRESO'
                            ELSE 'EGRESO'
                        END                                                                                                                                                                                 <alias name='operacion' />,
                        pe_sunat_tipdoc.tsunat                                                                                                                                                              <alias name='tipo_trx' />,
                        pe_sunat_tipdoc.descri                                                                                                                                                              <alias name='desc_trx' />,
                        crp_crpi_guia_interna.tipotransferencia                                                                                                                                             <alias name='tipo_transferencia' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0)
                            ELSE 0  
                        END                                                                                                                                                                                 <alias name='cos_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN glog_stkmov.stkm_canmov * -1
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='cos_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov * -1
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_egr' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='cos_saldo1' />,
                        0                                                                                                                                                                                   <alias name='can_ini' />,
                        0                                                                                                                                                                                   <alias name='cos_ini' />,
                        0                                                                                                                                                                                   <alias name='tot_ini' />,
                        0                                                                                                                                                                                   <alias name='can_fin' />,
                        0                                                                                                                                                                                   <alias name='cos_fin' />,
                        0                                                                                                                                                                                   <alias name='tot_fin' />,
                        NVL(geanmovl.impcos,0) * glog_stkmov.stkm_canmov                                                                                                                                    <alias name='imp_total' />,
                        glog_stkmov.stkm_canmov                                                                                                                                                             <alias name='can_total' />,
                        NVL(geanmovl.impcos,0)                                                                                                                                                              <alias name='costo' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                             ELSE 'INAFECTO'
                        END                                                                                                  <alias name='afecto_igv' />,
                        crp_crpi_guia_interna_detalle.precio                                                                                                                                                <alias name='precio' />,
                        crp_crpi_guia_interna_detalle.porcentajedr                                                                                                                                          <alias name='porcentajedr' />,
                        crp_crpi_guia_interna_detalle.precioajustado                                                                                                                                        <alias name='precioajustado' />,
                        crp_crpi_guia_interna_detalle.montosubtotal                                                                                                                                         <alias name='subtotal' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN crp_crpi_guia_interna_detalle.montosubtotal * (18/100)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='igv' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN (crp_crpi_guia_interna_detalle.montosubtotal * (18/100) + crp_crpi_guia_interna_detalle.montosubtotal)
                                ELSE crp_crpi_guia_interna_detalle.montosubtotal
                        END                                                                                                                                                                                 <alias name='total' />,
                        CASE WHEN geanmovh.tipdoc = 'RTRA' THEN geanmovh.refter
                             END                                                                                           <alias name='tipdoc_ant' />,
                        crp_crpi_guia_interna_detalle.numeroguiaorigen                                                      <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fecdoc_ant' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.numerodocumentopaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                             ELSE crp_crpi_guia_interna.numerodocumentopaciente 
                        END <alias name='dni_paciente' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.nombrepaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN nombrereceptor
                             ELSE crp_crpi_guia_interna.nombrepaciente 
                        END <alias name='nombre_paciente' />,
                        crp_maestro_compania.codigocompania                                                                                                                                                 <alias name='cod_cen_trab' />,
                        REPLACE(crp_maestro_compania.descripcioncompania, ';', ',')                                                                                                                    <alias name='des_cen_trab' />,
                        crp_maestro_financiador.descripcionfinanciador                                                                                                                                      <alias name='financiador' />,
                        crp_maestro_tipo_venta.descripcion                                                                                                                                                  <alias name='tipoventa' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_maestro_tipomodulo.descripcion
                             ELSE 'AMBULATORIO' 
                        END                                                                                                                                                                                 <alias name='plataforma' />,
                        crp_maestro_historiaclinica.codigo                                                                                                                                                  <alias name='historia_cli' />,
                        crp_maestro_admision.codigoadmision                                                                                                                                                 <alias name='nro_admision' />,
                        crp_maestro_admision.fechaingreso                                                                                                                                                   <alias name='fec_admision' />,
                        crp_maestro_admision.fechaaltapaciente                                                                                                                                              <alias name='fec_alta' />,
                        crp_maestro_medico.nombre || ' ' ||crp_maestro_medico.apellidopaterno                                                                                                               <alias name='medico_trata' />,
                        crp_maestro_especialidades.descripcionespecialidad                                                                                                                                  <alias name='especialidad' />,
                        CASE WHEN  crp_crpi_guia_interna.idtipoventa = 3 THEN 'Particulares'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 5 THEN 'Colaboradores'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 2 THEN 'Otros medicos' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 1 THEN 'Medicos accionistas' 
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'                             
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'                              
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (23,23)  THEN 'Donaciones'    
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato IN (1,4) THEN 'Particulares' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato NOT IN (1,4) THEN crp_maestro_modalidadfac.descripcionmodalidad  
                             ELSE  crp_maestro_modalidadfac.descripcionmodalidad                       
                         END                                                                                                                                                                                <alias name='modalidad_pago' />,
                        ''                                                                                                                                                                                  <alias name='nro_asiento_declarado' />,
                        '0000'                                                                                                                                                                              <alias name='cod_establecimiento' />,
                        '9'                                                                                                                                                                                 <alias name='catalogo' />,
                        NVL(crp_tipo_existencia.codigo, 99)                                                                                                                                                 <alias name='tipexist' />,
                        '1'                                                                                                                                                                                 <alias name='met_val' />,
                        <cast type='varchar' size='20'>NULL</cast>                                                                                                                                          <alias name='nro_liq' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='tip_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='ser_doc_copago' />,
                        crp_crpi_guia_interna.numerocomprobantecopago                                                                                                                                       <alias name='nro_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN crp_crpi_guia_interna.fechacomprobantecopago
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='fec_doc_copago' />,
                        crp_tipo_producto.descri                                                                                                                                                            <alias name='tipo_producto' />,
                        almacen_punto_consumo.nomalm                                                                                                                                                        <alias name='pto_cosumo' />,
                        crp_maestro_origenpedido.descripcionorigen                                                                                                                                          <alias name='zona' />,
                        crp_maestro_origenpedido.descripcionequipo                                                                                                                                          <alias name='desc_zona' />,
                        <cast type='decimal' size='5,3'>NULL</cast>                                                         <alias name='porc_descto' />,
                        garticul_ext.code_chavin                                                                                                                                                            <alias name='prod_chavin' />,
                        <!-- <alias name='tipo_atencion' /> -->
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='cod_procedimiento' />,
                        CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN crp_principio_activo.cod_unspsc || '00000000'
                                ELSE '0000000000000000'
                        END                                                                                                                                                                                 <alias name='producto_sunat' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='motivo_ajuste' />,
                        crp_crpi_guia_interna.codigousuario                                                                                                                                                 <alias name='cod_user' />,
                        crp_crpi_guia_interna.nombreusuario                                                                                                                                                 <alias name='des_user' />,
                        gartfami.nomfam                                                                                                                                                                    <alias name='familia' />,
                        crp_familia_flexline.descri                                                                                                                                                         <alias name='sub_familia' />,
                        crp_crpi_guia_interna.numeropedido                                                                                                                                                  <alias name='numeropedido' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='importecoaseguro' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='montocompania' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipopreciofijo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='anyo_chv' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='asien_ch' />,  
                        CASE WHEN NVL(geanmovh.loteid, 0) = 0 THEN '0'
                                ELSE '1'
                        END                                                                                                                                                                                 <alias name='flag_conta' />,
                        glog_stkmov.stkm_codalm                                                                                                                                                             <alias name='codigo_almacen' />,
                        <cast type='date'>crp_crpi_guia_interna.fechaguia</cast> <alias name='fecha_orden' />,
                        glog_stkmov.stkm_tabori,
                        glog_stkmov.stkm_cabori,
                        glog_stkmov.stkm_linori,
                        glog_stkmov.date_created,
                        glog_stkmov.stkm_seqno,
                        glog_stkmov.stkm_canmov,
                        crp_chv_mapcta_eanh_exi.ctaori                                                                             <alias name='ctacon_exi' />,
                        crp_chv_mapcta_eanh_cos.ctaori                                                                             <alias name='ctacon_con' />,
                        NVL(crp_chv_mapcen_lh_ean.cencos, crp_chv_mapcen_gh_ean.cencos) centro_coste
                    </columns>
                    <from table='crp_crpi_reversa_consigna'>
                        <join table='crp_crpi_guia_interna'>
                            <on>crp_crpi_reversa_consigna.idguiainterna = crp_crpi_guia_interna.idguiainterna</on>
                            <join table='crp_crpi_tipo_guia_interna'>
                                <on>crp_crpi_guia_interna.idtipotransaccion = crp_crpi_tipo_guia_interna.tipgi_tipdoc_crpi</on>
                            </join>
                            <join type='left' table='crp_maestro_financiador'>
                                <on>crp_crpi_guia_interna.idfinanciador = crp_maestro_financiador.idfinanciador</on>
                            </join>
                            <join type='left' table='crp_maestro_tipo_venta'>
                                <on>crp_crpi_guia_interna.idtipoventa = crp_maestro_tipo_venta.idtipoventa</on>
                            </join>                              
                            <join type='left' table='crp_maestro_tipomodulo'>
                                <on>crp_crpi_guia_interna.codigotipomodulo = crp_maestro_tipomodulo.codigo</on>
                            </join>
                            <join type='left' table='crp_maestro_historiaclinica'>
                                <on>crp_crpi_guia_interna.idhistoriaclinica = crp_maestro_historiaclinica.idhistoriaclinica</on>
                            </join>
                            <join type='left' table='crp_maestro_admision'>
                                <on>crp_crpi_guia_interna.idadmision = crp_maestro_admision.idadmision</on>
                            </join>
                            <join type='left' table='crp_maestro_medico'>
                                <on>crp_crpi_guia_interna.idmedico = crp_maestro_medico.idmedico</on>
                            </join>
                            <join type='left' table='crp_maestro_especialidades'>
                                <on>crp_crpi_guia_interna.idespecialidad = crp_maestro_especialidades.idespecialidad</on>
                            </join>
                            <join type='left' table='crp_maestro_modalidadfac'>
                                <on>crp_crpi_guia_interna.idmodalidadfacturacion = crp_maestro_modalidadfac.idmodalidadfacturacion</on>
                            </join>
                            <join type='left' table='crp_maestro_compania'>
                                <on>crp_crpi_guia_interna.idcompania = crp_maestro_compania.idcompania</on>
                            </join>
                            <join type='left' table='crp_maestro_origenpedido'>
                                <on>crp_crpi_guia_interna.idorigenpedido = crp_maestro_origenpedido.idorigenpedido</on>
                            </join>
                            <join type='left' table='crp_galmacen_equivalente_crpi'>
                                <on>crp_crpi_guia_interna.codigopuntoconsumo = crp_galmacen_equivalente_crpi.codigo_crpi</on>
                                <on>'FAR_PTOCONSUMO' = crp_galmacen_equivalente_crpi.tipo_maestro</on>
                                <join type='left' table='galmacen' alias='almacen_punto_consumo'>
                                    <on>crp_galmacen_equivalente_crpi.codalm_axional = almacen_punto_consumo.codigo</on>
                                </join>
                            </join>
                        </join>
                        <join table='geanmovh'>
                            <on>crp_crpi_reversa_consigna.cabiddoc = geanmovh.cabid</on>
                            <on>crp_crpi_reversa_consigna.tipodoc = geanmovh.tipdoc</on>
                            <on>crp_crpi_reversa_consigna.tabname = 'geanmovh'</on>
                            <join table='geanmovl'>
                                <on>geanmovh.cabid = geanmovl.cabid</on>
                                <join table='crp_crpi_guia_interna_detalle'>
                                    <on>crp_crpi_reversa_consigna.idguiainterna = crp_crpi_guia_interna_detalle.idguiainterna</on>
                                    <on>geanmovl.codart = crp_crpi_guia_interna_detalle.codigoproducto</on>
                                    <on>crp_crpi_guia_interna_detalle.idguiainternadetalle IN (SELECT MIN(d.idguiainternadetalle) 
                                                                                                 FROM crp_crpi_guia_interna_detalle d 
                                                                                                WHERE d.codigoproducto = geanmovl.codart
                                                                                                  AND d.idguiainterna = crp_crpi_reversa_consigna.idguiainterna)</on>
                                    <join type='left' table='crp_crpi_tipo_guia_interna' alias='tipo_guia_interna_origen'>
                                        <on>crp_crpi_guia_interna_detalle.idtipotransaccionorigen = tipo_guia_interna_origen.tipgi_tipdoc_crpi</on>
                                    </join>
                                </join>
                                <join table='glog_stkmov'>
                                    <on>geanmovl.cabid = glog_stkmov.stkm_cabori</on>
                                    <on>geanmovl.linid = glog_stkmov.stkm_linori</on>
                                    <on>'geanmovh' = glog_stkmov.stkm_tabori</on>
                                    <join table='galmacen' alias='galmacen_stkm'>
                                        <on>glog_stkmov.stkm_codalm = galmacen_stkm.codigo</on>
                                        <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_stkm'>
                                            <on>galmacen_stkm.codigo = equivalente_crpi_stkm.codalm_axional</on>
                                            <on>'GEN_ALMACEN' = equivalente_crpi_stkm.tipo_maestro</on>
                                            <on>equivalente_crpi_stkm.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                        </join>
                                    </join>
                                    <join table='gart_unimed'>
                                        <on>glog_stkmov.stkm_uom = gart_unimed.coduni</on>
                                        <join type='left' table='crp_unimed'>
                                            <on>gart_unimed.coduni = crp_unimed.codigo</on>
                                        </join>
                                    </join>
                                </join>
                                <join table='garticul'>
                                    <on>geanmovl.codart = garticul.codigo</on>
                                    <join table='garticul_ext'>
                                        <on>garticul.codigo = garticul_ext.codigo</on>
                                        <join type='left' table='crp_tipo_existencia'>
                                            <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                                        </join>
                                        <join type='left' table='crp_tipo_producto'>
                                            <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                                        </join>
                                    </join>
                                    <join type='left' table='crp_principio_activo'>
                                        <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                                    </join>
                                    <join table='gartfami'>
                                        <on>garticul.codfam = gartfami.codigo</on>
                                    </join>
                                    <join type='left' table='crp_familia_flexline'>
                                        <on>garticul.webfam = crp_familia_flexline.codigo</on>
                                    </join>
                                </join>
                            </join>
                            <join table='geanmovd'>
                                <on>geanmovh.tipdoc = geanmovd.codigo</on>
                                <join type='left' table='gconcuen' alias='gconcuen_eanh_exi'>
                                    <on>geanmovd.tipast = gconcuen_eanh_exi.tipast</on>
                                    <on>gartfami.tipcon = gconcuen_eanh_exi.codigo</on>
                                    <on>gconcuen_eanh_exi.relaci = 'EXI' </on>
                                    <on>gconcuen_eanh_exi.placon = 'PE' </on>
                                    <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_exi'>
                                        <on>gconcuen_eanh_exi.ctacon = crp_chv_mapcta_eanh_exi.cuenta</on>
                                    </join>
                                </join>
                                <join type='left' table='gconcuen' alias='gconcuen_eanh_cos'>
                                    <on>geanmovd.tipast = gconcuen_eanh_cos.tipast</on>
                                    <on>gartfami.tipcon = gconcuen_eanh_cos.codigo</on>
                                    <on>gconcuen_eanh_cos.relaci = 'COS' </on>
                                    <on>gconcuen_eanh_cos.placon = 'PE' </on>
                                    <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta_eanh_cos'>
                                        <on>gconcuen_eanh_cos.ctacon = crp_chv_mapcta_eanh_cos.cuenta</on>
                                    </join>
                                </join>
                                <join type='left' table='pe_sunat_tipdoc'>
                                    <on>geanmovd.codigo = pe_sunat_tipdoc.tipdoc</on>
                                </join>
                            </join>
                            <join table='galmacen' alias='galmacen_ori'>
                                    <on>geanmovh.almori = galmacen_ori.codigo</on>
                                    <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_ori'>
                                        <on>galmacen_ori.codigo = equivalente_crpi_ori.codalm_axional</on>
                                        <on>'GEN_ALMACEN' = equivalente_crpi_ori.tipo_maestro</on>
                                        <on>equivalente_crpi_ori.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                    </join>
                                </join>
                            <join type='left' table='galmacen' alias='galmacen_des'>
                                <on>geanmovh.almdes = galmacen_des.codigo</on>
                                <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_des'>
                                    <on>galmacen_des.codigo = equivalente_crpi_des.codalm_axional</on>
                                    <on>'GEN_ALMACEN' = equivalente_crpi_des.tipo_maestro</on>
                                    <on>equivalente_crpi_des.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                </join>
                            </join>
                            <join type='left' table='gdeparta' alias='gdeparta_ean'>
                                <on>geanmovh.depart = gdeparta_ean.depart</on>
                                <on>gdeparta_ean.delega = 'CRP0'</on>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_gh_ean'>
                                    <on>gdeparta_ean.seccio = crp_chv_mapcen_gh_ean.seccio</on>
                                    <on>crp_chv_mapcen_gh_ean.area = 'G'</on>
                                    <on>CAST(crp_chv_mapcen_gh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                </join>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_lh_ean'>
                                    <on>gdeparta_ean.seccio = crp_chv_mapcen_lh_ean.seccio</on>
                                    <on>crp_chv_mapcen_lh_ean.area = 'L'</on>
                                    <on>CAST(crp_chv_mapcen_lh_ean.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_ean.seccio
                                                                                        AND ccoste.area = 'L')</on>
                                </join>
                            </join>
                        </join>
                    </from>
                    <where>
                        ${mSqlCond} AND
                        geanmovh.tipdoc NOT IN ('CDEI', 'RCDI') AND
                        garticul_ext.is_kardex = 'S' AND
                        crp_crpi_guia_interna.fechaguia BETWEEN ? AND ?
                    </where>
                </select>
                <select>
                    <columns>
                        2                                                                                                                                                                                  <alias name='priori' />,
                        gcommovd.valord,
                        7 <alias name='ordqry' />,
                        TO_CHAR(gcommovh.fecmov, '%Y%m00')                                                                                                                                                  <alias name='periodo' />,
                        garticul.codigo                                                                                                                                                                     <alias name='producto' />,
                        garticul.nomart                                                                                                                                                                     <alias name='des_producto' />,
                        garticul.auxchr1                                                                                                                                                                    <alias name='principio_activo' />,
                        SUBSTR(garticul.webfam, 1, 5)                                                                                                                                                       <alias name='familia_n2' />,
                        garticul.webfam                                                                                                                                                                     <alias name='familia_n5' />,
                        equivalente_crpi_stkm.codigo_crpi                                                                                                                                                   <alias name='bodega' />,
                        glog_stkmov.stkm_cuenta                                                                                                                                                             <alias name='cuenta' />,
                        <cast type='char' size='5'>NULL</cast>    <alias name='origen_destino' />,
                        <cast type='char' size='5'>NULL</cast>    <alias name='cuenta_destino' />,
                        UPPER(gcommovd.nomdoc)                                                                                                                            <alias name='tipodocto' />,
                        gcommovh.cabid                                                                                                                                                                      <alias name='correlativo' />,
                        gcommovh.tipdoc                                                                                                                                                                     <alias name='tipologia' />,
                        gcommovh.docser                                                                                                                                                                     <alias name='numero' />,
                        <cast type='char' size='5'>NULL</cast>                                                                                                                                                    <alias name='numeroguia' />,
                        <cast type='varchar' size='10'>NULL</cast>                                                                                                                                          <alias name='nro_guia_chavin' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%d-%m-%Y')                                                                                                                                <alias name='fecdoc' />,
                        TO_CHAR(crp_crpi_guia_interna.fechaguia, '%H:%M:%S')                                                                                                                                <alias name='hora' />,
                        ctercero.cif                                                                                                                                                                        <alias name='ruc' />,
                        ctercero.nombre                                                                                                                                                                     <alias name='razon_social' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'B' THEN '03'
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1) = 'F' THEN '01'
                        ELSE NULL
                        END                                                                                                                                                                                 <alias name='tipdoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='serdoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN crp_crpi_guia_interna.numerocomprobantecopago
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='nrodoc' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) AND crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN <cast type='datetime' size='year to second'>crp_crpi_guia_interna.fechacomprobantecopago</cast>
                             ELSE NULL
                        END                                                                                                                                                                                 <alias name='fecdoccp' />,
                        gart_unimed.nomuni                                                                                                                                          <alias name='unimed' />,
                        NVL(crp_unimed.codsun, 'NIU')                                                                                                                                                       <alias name='unimed_sunat' />,
                        CASE WHEN glog_stkmov.stkm_canmov > 0 THEN 'INGRESO'
                            ELSE 'EGRESO'
                        END                                                                                                                                                                                 <alias name='operacion' />,
                        pe_sunat_tipdoc.tsunat                                                                                                                                                              <alias name='tipo_trx' />,
                        pe_sunat_tipdoc.descri                                                                                                                                                              <alias name='desc_trx' />,
                        crp_crpi_guia_interna.tipotransferencia                                                                                                                                             <alias name='tipo_transferencia' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(gcommovl.impcos,0)
                            ELSE 0  
                        END                                                                                                                                                                                 <alias name='cos_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &gt; 0 THEN NVL(gcommovl.impcos,0) * glog_stkmov.stkm_canmov
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_ing' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN glog_stkmov.stkm_canmov * -1
                            ELSE 0
                        END                                                                                                                                                                                 <alias name='can_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(gcommovl.impcos,0)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='cos_egr' />,
                        CASE WHEN glog_stkmov.stkm_canmov &lt; 0 THEN NVL(gcommovl.impcos,0) * glog_stkmov.stkm_canmov * -1
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='tot_egr' />,
                        NVL(gcommovl.impcos,0)                                                                                                                                                              <alias name='cos_saldo1' />,
                        0                                                                                                                                                                                   <alias name='can_ini' />,
                        0                                                                                                                                                                                   <alias name='cos_ini' />,
                        0                                                                                                                                                                                   <alias name='tot_ini' />,
                        0                                                                                                                                                                                   <alias name='can_fin' />,
                        0                                                                                                                                                                                   <alias name='cos_fin' />,
                        0                                                                                                                                                                                   <alias name='tot_fin' />,
                        NVL(gcommovl.impcos,0) * glog_stkmov.stkm_canmov                                                                                                                                    <alias name='imp_total' />,
                        glog_stkmov.stkm_canmov                                                                                                                                                             <alias name='can_total' />,
                        NVL(gcommovl.impcos,0)                                                                                                                                                              <alias name='costo' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                             ELSE 'INAFECTO'
                        END                                                                                                  <alias name='afecto_igv' />,
                        crp_crpi_guia_interna_detalle.precio                                                                                                                                                <alias name='precio' />,
                        crp_crpi_guia_interna_detalle.porcentajedr                                                                                                                                          <alias name='porcentajedr' />,
                        crp_crpi_guia_interna_detalle.precioajustado                                                                                                                                        <alias name='precioajustado' />,
                        crp_crpi_guia_interna_detalle.montosubtotal                                                                                                                                         <alias name='subtotal' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN crp_crpi_guia_interna_detalle.montosubtotal * (18/100)
                                ELSE 0
                        END                                                                                                                                                                                 <alias name='igv' />,
                        CASE WHEN crp_crpi_guia_interna.flagafectoigv = 'T' THEN (crp_crpi_guia_interna_detalle.montosubtotal * (18/100) + crp_crpi_guia_interna_detalle.montosubtotal)
                                ELSE crp_crpi_guia_interna_detalle.montosubtotal
                        END                                                                                                                                                                                 <alias name='total' />,
                        crp_crpi_tipo_guia_interna.tipgi_descripcion_crpi                                                   <alias name='tipdoc_ant' />,
                        crp_crpi_guia_interna_detalle.numeroguiaorigen                                                      <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fecdoc_ant' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.numerodocumentopaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN numerodocumentoreceptor
                             ELSE crp_crpi_guia_interna.numerodocumentopaciente 
                        END <alias name='dni_paciente' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_crpi_guia_interna.nombrepaciente
                             WHEN crp_crpi_guia_interna.idtipoventa IN (1, 2, 3, 5) THEN nombrereceptor
                             ELSE crp_crpi_guia_interna.nombrepaciente 
                        END <alias name='nombre_paciente' />,
                        crp_maestro_compania.codigocompania                                                                                                                                                 <alias name='cod_cen_trab' />,
                        REPLACE(crp_maestro_compania.descripcioncompania, ';', ',')                                                                                                                    <alias name='des_cen_trab' />,
                        crp_maestro_financiador.descripcionfinanciador                                                                                                                                      <alias name='financiador' />,
                        crp_maestro_tipo_venta.descripcion                                                                                                                                                  <alias name='tipoventa' />,
                        CASE WHEN crp_crpi_guia_interna.idtipoventa = 4 THEN crp_maestro_tipomodulo.descripcion
                             ELSE 'AMBULATORIO' 
                        END                                                                                                 <alias name='plataforma' />,
                        crp_maestro_historiaclinica.codigo                                                                                                                                                  <alias name='historia_cli' />,
                        crp_maestro_admision.codigoadmision                                                                                                                                                 <alias name='nro_admision' />,
                        crp_maestro_admision.fechaingreso                                                                                                                                                   <alias name='fec_admision' />,
                        crp_maestro_admision.fechaaltapaciente                                                                                                                                              <alias name='fec_alta' />,
                        crp_maestro_medico.nombre || ' ' ||crp_maestro_medico.apellidopaterno                                                                                                               <alias name='medico_trata' />,
                        crp_maestro_especialidades.descripcionespecialidad                                                                                                                                  <alias name='especialidad' />,
                        CASE WHEN  crp_crpi_guia_interna.idtipoventa = 3 THEN 'Particulares'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 5 THEN 'Colaboradores'  
                             WHEN  crp_crpi_guia_interna.idtipoventa = 2 THEN 'Otros medicos' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 1 THEN 'Medicos accionistas' 
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor  = '20512065849'  THEN 'Sedes'                             
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 0 AND idtipotransaccion IN (7,11) AND numerodocumentoreceptor != '20512065849'  THEN 'Terceros'                              
                             WHEN  crp_crpi_guia_interna.idtipoventa IS NULL AND idtipotransaccion IN (23,23)  THEN 'Donaciones'    
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato IN (1,4) THEN 'Particulares' 
                             WHEN  crp_crpi_guia_interna.idtipoventa = 4 AND  crp_crpi_guia_interna.tipocontrato NOT IN (1,4) THEN crp_maestro_modalidadfac.descripcionmodalidad  
                             ELSE  crp_maestro_modalidadfac.descripcionmodalidad                       
                         END                                                                                                                                                                                <alias name='modalidad_pago' />,
                        ''                                                                                                                                                                     <alias name='nro_asiento_declarado' />,
                        '0000'                                                                                                                                                                              <alias name='cod_establecimiento' />,
                        '9'                                                                                                                                                                                 <alias name='catalogo' />,
                        NVL(crp_tipo_existencia.codigo, 99)                                                                                                                                                 <alias name='tipexist' />,
                        '1'                                                                                                                                                                                 <alias name='met_val' />,
                        <cast type='varchar' size='20'>NULL</cast>                                                                                                                                          <alias name='nro_liq' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, 1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='tip_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN SUBSTR(crp_crpi_guia_interna.numerocomprobantecopago, 0, CHARINDEX('-', crp_crpi_guia_interna.numerocomprobantecopago)-1)
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='ser_doc_copago' />,
                        crp_crpi_guia_interna.numerocomprobantecopago                                                                                                                                       <alias name='nro_doc_copago' />,
                        CASE WHEN crp_crpi_guia_interna.numerocomprobantecopago IS NOT NULL THEN crp_crpi_guia_interna.fechacomprobantecopago
                                ELSE NULL
                        END                                                                                                                                                                                 <alias name='fec_doc_copago' />,
                        crp_tipo_producto.descri                                                                                                                                                            <alias name='tipo_producto' />,
                        almacen_punto_consumo.nomalm                                                                                                                                                        <alias name='pto_cosumo' />,
                        crp_maestro_origenpedido.descripcionorigen                                                                                                                                          <alias name='zona' />,
                        crp_maestro_origenpedido.descripcionequipo                                                                                                                                          <alias name='desc_zona' />,
                        <cast type='decimal' size='5,3'>NULL</cast>                                                                                                                                         <alias name='porc_descto' />,
                        garticul_ext.code_chavin                                                                                                                                                            <alias name='prod_chavin' />,
                        <!-- <alias name='tipo_atencion' /> -->
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              <alias name='cod_procedimiento' />,
                        CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN crp_principio_activo.cod_unspsc || '00000000'
                                ELSE '0000000000000000'
                        END                                                                                                                                                                                 <alias name='producto_sunat' />,
                        <cast type='char' size='1'>NULL</cast>                                                                                                                                              <alias name='motivo_ajuste' />,
                        crp_crpi_guia_interna.codigousuario                                                                                                                                                 <alias name='cod_user' />,
                        crp_crpi_guia_interna.nombreusuario                                                                                                                                                 <alias name='des_user' />,
                        gartfami.nomfam                                                                                                                                                                     <alias name='familia' />,
                        crp_familia_flexline.descri                                                                                                                                                         <alias name='sub_familia' />,
                        crp_crpi_guia_interna.numeropedido                                                                                                                                                  <alias name='numeropedido' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='importecoaseguro' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='montocompania' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipopreciofijo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='anyo_chv' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='asien_ch' />,
                        CASE WHEN NVL(gcommovh.loteid, 0) = 0 THEN '0'
                                ELSE '1'
                        END                                                                                                                                                                                 <alias name='flag_conta' />,
                        glog_stkmov.stkm_codalm                                                                                                                                                             <alias name='codigo_almacen' />,
                        <cast type='date'>crp_crpi_guia_interna.fechaguia</cast> <alias name='fecha_orden' />,
                        glog_stkmov.stkm_tabori,
                        glog_stkmov.stkm_cabori,
                        glog_stkmov.stkm_linori,
                        glog_stkmov.date_created,
                        glog_stkmov.stkm_seqno,
                        glog_stkmov.stkm_canmov,
                        <cast type='char' size='1'>NULL</cast>                                                               <alias name='ctacon_exi' />,
                        <cast type='char' size='1'>NULL</cast>                                                               <alias name='ctacon_con' />,
                        NVL(NVL(NVL(crp_chv_mapcen_l.cencos, crp_chv_mapcen_g.cencos), crp_chv_mapcen_lh.cencos), crp_chv_mapcen_gh.cencos)  <alias name='centro_coste' />
                    </columns>
                    <from table='crp_crpi_reversa_consigna'>
                        <join table='crp_crpi_guia_interna'>
                            <on>crp_crpi_reversa_consigna.idguiainterna = crp_crpi_guia_interna.idguiainterna</on>
                            <join table='crp_crpi_tipo_guia_interna'>
                                <on>crp_crpi_guia_interna.idtipotransaccion = crp_crpi_tipo_guia_interna.tipgi_tipdoc_crpi</on>
                            </join>
                            <join type='left' table='crp_maestro_financiador'>
                                <on>crp_crpi_guia_interna.idfinanciador = crp_maestro_financiador.idfinanciador</on>
                            </join>
                            <join type='left' table='crp_maestro_tipo_venta'>
                                <on>crp_crpi_guia_interna.idtipoventa = crp_maestro_tipo_venta.idtipoventa</on>
                            </join> 
                            <join type='left' table='crp_maestro_tipomodulo'>
                                <on>crp_crpi_guia_interna.codigotipomodulo = crp_maestro_tipomodulo.codigo</on>
                            </join>
                            <join type='left' table='crp_maestro_historiaclinica'>
                                <on>crp_crpi_guia_interna.idhistoriaclinica = crp_maestro_historiaclinica.idhistoriaclinica</on>
                            </join>
                            <join type='left' table='crp_maestro_admision'>
                                <on>crp_crpi_guia_interna.idadmision = crp_maestro_admision.idadmision</on>
                            </join>
                            <join type='left' table='crp_maestro_medico'>
                                <on>crp_crpi_guia_interna.idmedico = crp_maestro_medico.idmedico</on>
                            </join>
                            <join type='left' table='crp_maestro_especialidades'>
                                <on>crp_crpi_guia_interna.idespecialidad = crp_maestro_especialidades.idespecialidad</on>
                            </join>
                            <join type='left' table='crp_maestro_modalidadfac'>
                                <on>crp_crpi_guia_interna.idmodalidadfacturacion = crp_maestro_modalidadfac.idmodalidadfacturacion</on>
                            </join>
                            <join type='left' table='crp_maestro_compania'>
                                <on>crp_crpi_guia_interna.idcompania = crp_maestro_compania.idcompania</on>
                            </join>
                            <join type='left' table='crp_maestro_origenpedido'>
                                <on>crp_crpi_guia_interna.idorigenpedido = crp_maestro_origenpedido.idorigenpedido</on>
                            </join>
                            <join type='left' table='crp_galmacen_equivalente_crpi'>
                                <on>crp_crpi_guia_interna.codigopuntoconsumo = crp_galmacen_equivalente_crpi.codigo_crpi</on>
                                <on>'FAR_PTOCONSUMO' = crp_galmacen_equivalente_crpi.tipo_maestro</on>
                                <join type='left' table='galmacen' alias='almacen_punto_consumo'>
                                    <on>crp_galmacen_equivalente_crpi.codalm_axional = almacen_punto_consumo.codigo</on>
                                </join>
                            </join>
                        </join>
                        <join table='gcommovh'>
                            <on>crp_crpi_reversa_consigna.cabiddoc = gcommovh.cabid</on>
                            <on>crp_crpi_reversa_consigna.tipodoc = gcommovh.tipdoc</on>
                            <on>crp_crpi_reversa_consigna.tabname = 'gcommovh'</on>
                            <join table='gcommovl'>
                                <on>gcommovh.cabid = gcommovl.cabid</on>
                                <join table='crp_crpi_guia_interna_detalle'>
                                    <on>crp_crpi_reversa_consigna.idguiainterna = crp_crpi_guia_interna_detalle.idguiainterna</on>
                                    <on>gcommovl.codart = crp_crpi_guia_interna_detalle.codigoproducto</on>
                                    <on>crp_crpi_guia_interna_detalle.idguiainternadetalle IN (SELECT MIN(d.idguiainternadetalle) 
                                                                                                 FROM crp_crpi_guia_interna_detalle d 
                                                                                                WHERE d.codigoproducto = gcommovl.codart
                                                                                                  AND d.idguiainterna = crp_crpi_reversa_consigna.idguiainterna)</on>
                                    <join type='left' table='crp_crpi_tipo_guia_interna' alias='tipo_guia_interna_origen'>
                                        <on>crp_crpi_guia_interna_detalle.idtipotransaccionorigen = tipo_guia_interna_origen.tipgi_tipdoc_crpi</on>
                                    </join>
                                </join>
                                <join table='glog_stkmov'>
                                    <on>gcommovl.cabid = glog_stkmov.stkm_cabori</on>
                                    <on>gcommovl.linid = glog_stkmov.stkm_linori</on>
                                    <on>'gcommovh' = glog_stkmov.stkm_tabori</on>
                                    <join table='galmacen' alias='galmacen_stkm'>
                                        <on>glog_stkmov.stkm_codalm = galmacen_stkm.codigo</on>
                                        <join type='left' table='crp_galmacen_equivalente_crpi' alias='equivalente_crpi_stkm'>
                                            <on>galmacen_stkm.codigo = equivalente_crpi_stkm.codalm_axional</on>
                                            <on>'GEN_ALMACEN' = equivalente_crpi_stkm.tipo_maestro</on>
                                            <on>equivalente_crpi_stkm.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                                        </join>
                                    </join>
                                    <join table='gart_unimed'>
                                        <on>glog_stkmov.stkm_uom = gart_unimed.coduni</on>
                                        <join type='left' table='crp_unimed'>
                                            <on>gart_unimed.coduni = crp_unimed.codigo</on>
                                        </join>
                                    </join>
                                </join>
                                <join table='garticul'>
                                    <on>gcommovl.codart = garticul.codigo</on>
                                        <join table='garticul_ext'>
                                        <on>garticul.codigo = garticul_ext.codigo</on>
                                        <join type='left' table='crp_tipo_existencia'>
                                            <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                                        </join>
                                        <join type='left' table='crp_tipo_producto'>
                                            <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                                        </join>
                                    </join>
                                    <join type='left' table='crp_principio_activo'>
                                        <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                                    </join>
                                    <join table='gartfami'>
                                        <on>garticul.codfam = gartfami.codigo</on>
                                    </join>
                                    <join type='left' table='crp_familia_flexline'>
                                        <on>garticul.webfam = crp_familia_flexline.codigo</on>
                                    </join>
                                </join>
                                <join type='left' table='gcommovl_datc'>
                                    <on>gcommovl.linid = gcommovl_datc.linid</on>
                                    <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_g'>
                                        <on>gcommovl_datc.seccio = crp_chv_mapcen_g.seccio</on>
                                        <on>crp_chv_mapcen_g.area = 'G'</on>
                                        <on>CAST(crp_chv_mapcen_g.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gcommovl_datc.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                    </join>
                                    <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_l'>
                                        <on>gcommovl_datc.seccio = crp_chv_mapcen_l.seccio</on>
                                        <on>crp_chv_mapcen_l.area = 'L'</on>
                                        <on>CAST(crp_chv_mapcen_l.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gcommovl_datc.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                    </join>
                                </join>
                            </join>
                            <join table='gcommovd'>
                               <on>gcommovh.tipdoc = gcommovd.codigo</on>
                               <join type='left' table='pe_sunat_tipdoc'>
                                    <on>gcommovd.codigo = pe_sunat_tipdoc.tipdoc</on>
                                </join>
                            </join>
                            <join table='ctercero'>
                                <on>gcommovh.tercer = ctercero.codigo</on>
                            </join>
                            <join type='left' table='gdeparta' alias='gdeparta_alb'>
                                <on>gcommovh.depart = gdeparta_alb.depart</on>
                                <on>gdeparta_alb.delega = 'CRP0'</on>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_gh'>
                                    <on>gdeparta_alb.seccio = crp_chv_mapcen_gh.seccio</on>
                                    <on>crp_chv_mapcen_gh.area = 'G'</on>
                                    <on>CAST(crp_chv_mapcen_gh.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_alb.seccio
                                                                                        AND ccoste.area = 'G')</on>
                                </join>
                                <join type='left' table='crp_chv_mapcen' alias='crp_chv_mapcen_lh'>
                                    <on>gdeparta_alb.seccio = crp_chv_mapcen_lh.seccio</on>
                                    <on>crp_chv_mapcen_lh.area = 'L'</on>
                                    <on>CAST(crp_chv_mapcen_gh.cencos AS INTEGER) IN (SELECT MAX(CAST(ccoste.cencos AS INTEGER)) 
                                                                                        FROM crp_chv_mapcen ccoste
                                                                                    WHERE ccoste.seccio = gdeparta_alb.seccio
                                                                                        AND ccoste.area = 'L')</on>
                                </join>
                            </join>
                        </join>
                    </from>
                    <where>
                        ${mSqlCond} AND
                        garticul_ext.is_kardex = 'S' AND
                        crp_crpi_guia_interna.fechaguia BETWEEN ? AND ?
                    </where>
                </select>
                <!-- ----------------------------------------------------------------------------------------------------------- -->
                <!-- FIN DOS SELECT SOBRE LOS MOVIMENTOS DE TRANSACCION DE CONSIGNADOS QUE AFECTEN A ALMACENES DE NO CONSIGNADOS -->
                <!-- ----------------------------------------------------------------------------------------------------------- -->
                <select>
                    <columns>
                        1 <alias name='priori' />,
                        1 <alias name='valord' />,
                        8 <alias name='ordqry' />,
                        TO_CHAR(gcommovh.fecmov, '%Y%m00')                                                                  <alias name='periodo' />,
                        garticul.codigo                                                                                     <alias name='producto' />,
                        garticul.nomart                                                                                     <alias name='des_producto' />,
                        garticul.auxchr1                                                                                    <alias name='principio_activo' />,
                        SUBSTR(garticul.webfam, 1, 5)                                                                       <alias name='familia_n2' />,
                        garticul.webfam                                                                                     <alias name='familia_n5' />,
                        crp_galmacen_equivalente_crpi.codigo_crpi                                                           <alias name='bodega' />,
                        glog_stkmov.stkm_cuenta                                                                             <alias name='cuenta' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='origen_destino' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='cuenta_destino' />,
                        <cast type='char' size='50'>'SALDOS INICIALES'</cast>                                               <alias name='tipodocto' />,
                        <cast type='integer' >NULL</cast>                                                                   <alias name='correlativo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipologia' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='numero' />,
                        <cast type='char' size='5'>NULL</cast>                                                              <alias name='numeroguia' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_guia_chavin' />,
                        TO_CHAR(gcommovh.fecmov, '%d-%m-%Y')                                                                <alias name='fecdoc' />,
                        TO_CHAR(gcommovh.fecmov, '%H:%M:%S')                                                                <alias name='hora' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ruc' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='razon_social' />,
                        '00'                                                                                                <alias name='tipdoc' />,
                        ''                                                                                                  <alias name='serdoc' />,
                        ''                                                                                                  <alias name='nrodoc' />,
                        <cast type='datetime' size='year to second'>NULL</cast>                                             <alias name='fecdoccp' />,
                        gart_unimed.nomuni                                                                                  <alias name='unimed' />,
                        crp_unimed.codsun                                                                                   <alias name='unimed_sunat' />,
                        'INGRESO'                                                                                           <alias name='operacion' />,
                        '16'                                                                                                <alias name='tipo_trx' />,
                        'SALDO INICIAL'                                                                                     <alias name='desc_trx'/>,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipo_transferencia' />,
                        glog_stkmov.stkm_canmov                                                                             <alias name='can_ing' />,
                        gcommovl.precio                                                                                     <alias name='cos_ing' />,
                        glog_stkmov.stkm_canmov * gcommovl.precio                                                           <alias name='tot_ing' />,
                        0                                                                                                   <alias name='can_egr' />,
                        0                                                                                                   <alias name='cos_egr' />,
                        0                                                                                                   <alias name='tot_egr' />,
                        gcommovl.precio                                                                                     <alias name='cos_saldo1' />,
                        glog_stkmov.stkm_canmov                                                                             <alias name='can_ini' />,
                        gcommovl.precio                                                                                     <alias name='cos_ini' />,
                        glog_stkmov.stkm_canmov * gcommovl.precio                                                           <alias name='tot_ini' />,
                        0                                                                                                   <alias name='can_fin' />,
                        0                                                                                                   <alias name='cos_fin' />,
                        0                                                                                                   <alias name='tot_fin' />,
                        glog_stkmov.stkm_canmov * gcommovl.precio                                                           <alias name='imp_total' />,
                        glog_stkmov.stkm_canmov                                                                             <alias name='can_total' />,
                        gcommovl.precio                                                                                     <alias name='costo' />,
                        CASE WHEN garticul.taxkey = 'BOG' THEN 'AFECTO'
                             ELSE 'INAFECTO'
                        END                                                                                                  <alias name='afecto_igv' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='precio' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='porcentajedr' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='precioajustado' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='subtotal' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='igv' />,
                        <cast type='decimal' size='1'>NULL</cast>                                                           <alias name='total' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipdoc_ant' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nrodoc_ant' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fecdoc_ant' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='dni_paciente' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nombre_paciente' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='cod_cen_trab' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='des_cen_trab' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='financiador' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipoventa' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='plataforma' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='historia_cli' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_admision' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fec_admision' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fec_alta' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='medico_trata' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='especialidad' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='modalidad_pago' />,
                        ''                                                                                                 <alias name='nro_asiento_declarado' />,
                        '0000'                                                                                              <alias name='cod_establecimiento' />,
                        '9'                                                                                                 <alias name='catalogo' />,
                        NVL(crp_tipo_existencia.codigo, 99)                                                                 <alias name='tipexist' />,
                        '1'                                                                                                 <alias name='met_val' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_liq' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tip_doc_copago' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ser_doc_copago' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='nro_doc_copago' />,
                        <cast type='datetime' size='year to fraction'>NULL</cast>                                           <alias name='fec_doc_copago' />,
                        crp_tipo_producto.descri                                                                            <alias name='tipo_producto' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='pto_cosumo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='zona' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='desc_zona' />,
                        <cast type='decimal' size='5,3'>NULL</cast>                                                         <alias name='porc_descto' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='prod_chavin' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='cod_procedimiento' />,
                        CASE WHEN crp_principio_activo.cod_unspsc IS NOT NULL THEN crp_principio_activo.cod_unspsc || '00000000'
                             ELSE '0000000000000000'
                        END                                                                                                 <alias name='producto_sunat' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='motivo_ajuste' />,
                        NVL(cuserids.usercode, 'informix')                                                                  <alias name='cod_user' />,
                        NVL(cuserids.username, 'informix')                                                                  <alias name='des_user' />,
                        gartfami.nomfam                                                                                     <alias name='familia' />,
                        crp_familia_flexline.descri                                                                         <alias name='sub_familia' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='numeropedido' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='importecoaseguro' />,
                        <cast type='decimal' size='22,8'>NULL</cast>                                                        <alias name='montocompania' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='tipopreciofijo' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='anyo_chv' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='asien_ch' />,
                        '1'                                                                                                 <alias name='flag_conta' />,
                        glog_stkmov.stkm_codalm                                                                             <alias name='codigo_almacen' />,
                        <cast type='date'>gcommovh.fecmov</cast>                                                            <alias name='fecha_orden' />,
                        'galmvalo'                                                                                          <alias name='stkm_tabori' />,
                        0                                                                                                   <alias name='stkm_cabori' />,
                        0                                                                                                   <alias name='stkm_linori' />,
                        glog_stkmov.date_created   <alias name='date_created' />,
                        1 stkm_seqno,
                        1 stkm_canmov,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ctacon_exi' />,
                        <cast type='char' size='1'>NULL</cast>                                                              <alias name='ctacon_con' />,
                        <cast type='char' size='1'>NULL</cast>  <alias name='centro_coste' />
                    </columns>
                    <from table='glog_stkmov'>
                        <join table='gcommovl'>
                            <on>glog_stkmov.stkm_cabori = gcommovl.cabid</on>
                            <on>glog_stkmov.stkm_linori = gcommovl.linid</on>
                            <on>glog_stkmov.stkm_tabori = 'gcommovh'</on>
                            <join table='gcommovh'>
                                <on>gcommovl.cabid = gcommovh.cabid</on>
                                <join type='left' table='cuserids'>
                                    <on>gcommovh.user_updated = cuserids.usercode</on>
                                    <on>cuserids.usercode != 'informix'</on>
                                </join>
                            </join>
                            <join table='garticul'>
                                <on>gcommovl.codart = garticul.codigo</on>
                                <join table='garticul_ext'>
                                    <on>garticul.codigo = garticul_ext.codigo</on>
                                    <join type='left' table='crp_tipo_existencia'>
                                        <on>garticul_ext.tipo_existencia = crp_tipo_existencia.codigo</on>
                                    </join>
                                    <join type='left' table='crp_tipo_producto'>
                                        <on>garticul_ext.tipo_producto = crp_tipo_producto.codigo</on>
                                    </join>
                                </join>
                                <join type='left' table='crp_principio_activo'>
                                    <on>garticul.auxchr1 = crp_principio_activo.codigo</on>
                                </join>
                                <join table='gartfami'>
                                    <on>garticul.codfam = gartfami.codigo</on>
                                </join>
                                <join type='left' table='crp_familia_flexline'>
                                    <on>garticul.webfam = crp_familia_flexline.codigo</on>
                                </join>
                            </join>
                        </join>     
                        <join table='gart_unimed'>
                            <on>glog_stkmov.stkm_uom = gart_unimed.coduni</on>
                            <join type='left' table='crp_unimed'>
                                <on>gart_unimed.coduni = crp_unimed.codigo</on>
                            </join>
                        </join>
                        <join table='galmacen'>
                            <on>glog_stkmov.stkm_codalm = galmacen.codigo</on>
                            <join type='left' table='crp_galmacen_equivalente_crpi'>
                                <on>galmacen.codigo = crp_galmacen_equivalente_crpi.codalm_axional</on>
                                <on>'GEN_ALMACEN' = crp_galmacen_equivalente_crpi.tipo_maestro</on>
                                <on>crp_galmacen_equivalente_crpi.cuenta IN ('DISP', 'CDFA', 'CDCO')</on>
                            </join>
                        </join>
                    </from>
                    <where>
                        ${mSqlCond} AND
                        garticul_ext.is_kardex = 'S' AND
                        gcommovh.fecmov &gt; '14-10-2022' AND
                        gcommovh.fecmov BETWEEN ? AND ? AND
                        gcommovh.tipdoc = 'AANT'
                    </where>
                </select>
                <order>
                    producto ASC, priori ASC, fecha_orden ASC, valord ASC, hora ASC, date_created ASC, stkm_canmov DESC, stkm_seqno ASC, codigo_almacen ASC
                </order>
            </union>
        `, pDateFecini, pDateFecfin, mDateTimeFecini, mDateTimeFecfin, pDateFecini, pDateFecfin, mDateTimeFecini, mDateTimeFecfin, mDateTimeFecini, mDateTimeFecfin, mDateTimeFecini, mDateTimeFecfin, pDateFecini, pDateFecfin));
        /** *********************************************************************
         * Compara el artículo actual con el siguiente, de ser iguales, el stock,
         * coste y saldo total, se acumulan, caso contrario empieza de 0. */
        /** ********************************************************************* */

        /* Nueva columna se obtiene a partir de la suma stock */
    }).cols().add('can_saldo', Ax.sql.Types.DOUBLE, v => {
        if (codartPasado === '' || codartPasado == v.getString('producto')) {
            codartPasado = v.getString('producto');
            stockPasado += v.getDouble('can_total');
        } else {
            codartPasado = v.getString('producto');
            stockPasado = 0;
            stockPasado += v.getDouble('can_total');
        }
        return stockPasado;
        /* Nueva columna se obtiene a partir de la suma del saldo_total (importe * stock) */
    }).cols().add('tot_saldo', Ax.sql.Types.DOUBLE, v => {
        if (codartPasado === '' || codartPasado == v.getString('producto')) {
            codartPasado = v.getString('producto');
            importePasado += v.getDouble('imp_total');
        } else {
            codartPasado = v.getString('producto');
            importePasado = 0;
            importePasado += v.getDouble('imp_total');
        }
        return importePasado;
        /* Nueva columna se obtiene a partir del saldo total entre el stock acumulado */
    }).cols().add('cos_saldo', Ax.sql.Types.DOUBLE, v => {
        if (codartPasado === '' || codartPasado == v.getString('producto')) {
            codartPasado = v.getString('producto');
            stockPasado1 += v.getDouble('can_total');
            importePasado1 += v.getDouble('imp_total');

            if (stockPasado1 != 0) {
                costoPasado = importePasado1 / stockPasado1;
            } else {
                costoPasado = 0;
            }

        } else {
            codartPasado = v.getString('producto');
            stockPasado1 = 0;
            stockPasado1 += v.getDouble('can_total');
            importePasado1 = 0;
            importePasado1 += v.getDouble('imp_total');

            costoPasado = 0;

            if (stockPasado1 != 0) {
                costoPasado = importePasado1 / stockPasado1;
            } else {
                costoPasado = 0;
            }

        }
        return costoPasado;
    }).cols().add('clave_unica', Ax.sql.Types.CHAR, v => {
        var mStrText = new Ax.lang.String(auto_increment);
        var mStrResult = mStringPeriodo + mStrText.lpad('0', mIntSize);
        auto_increment++;

        return mStrResult;
    }).toJSONArray();

    /* Bucle para obtener el saldo final para el útimo registro del artículo, indepediente por cada artículo. */
    for (let i = 0; i < rsKardex.length - 1; i++) {
        if (i + 1 == rsKardex.length - 1) { // cuando el artículo sea ya el ultimo o es un solo registro, debe tener saldo final
            rsKardex[i + 1].can_fin = rsKardex[i + 1].can_saldo;
            rsKardex[i + 1].tot_fin = rsKardex[i + 1].tot_saldo;
            rsKardex[i + 1].cos_fin = rsKardex[i + 1].cos_saldo;
        }
        // Si el artículo siguiente es diferente que el artículo actual, entonces se actualiza la columna saldo final.
        if (rsKardex[i].producto != rsKardex[i + 1].producto) {
            rsKardex[i].can_fin = rsKardex[i].can_saldo;
            rsKardex[i].tot_fin = rsKardex[i].tot_saldo;
            rsKardex[i].cos_fin = rsKardex[i].cos_saldo;
        }
    }

    var rs3 = new Ax.rs.Reader().memory(options => {
        options.setColumnNames([
            'priori',
            'valord',
            'ordqry',
            'periodo',
            'producto',
            'des_producto',
            'bodega',
            'cuenta',
            'origen_destino',
            'cuenta_destino',
            'tipodocto',
            'correlativo',
            'tipologia',
            'numero',
            'numeroguia',
            'nro_guia_chavin',
            'fecdoc',
            'hora',
            'ruc',
            'razon_social',
            'tipdoc',
            'serdoc',
            'nrodoc',
            'fecdoccp',
            'unimed',
            'unimed_sunat',
            'operacion',
            'tipo_trx',
            'desc_trx',
            'tipo_transferencia',
            'can_ing',
            'cos_ing',
            'tot_ing',
            'can_egr',
            'cos_egr',
            'tot_egr',
            'can_saldo',
            'cos_saldo',
            'tot_saldo',
            'can_ini',
            'cos_ini',
            'tot_ini',
            'can_fin',
            'cos_fin',
            'tot_fin',
            'imp_total',
            'can_total',
            'costo',
            'afecto_igv',
            'precio',
            'porcentajedr',
            'precioajustado',
            'subtotal',
            'igv',
            'total',
            'tipdoc_ant',
            'nrodoc_ant',
            'fecdoc_ant',
            'dni_paciente',
            'nombre_paciente',
            'cod_cen_trab',
            'des_cen_trab',
            'financiador',
            'tipoventa',
            'plataforma',
            'historia_cli',
            'nro_admision',
            'fec_admision',
            'fec_alta',
            'medico_trata',
            'especialidad',
            'modalidad_pago',
            'nro_asiento_declarado',
            'cod_establecimiento',
            'catalogo',
            'tipexist',
            'met_val',
            'nro_liq',
            'tip_doc_copago',
            'ser_doc_copago',
            'nro_doc_copago',
            'fec_doc_copago',
            'tipo_producto',
            'pto_consumo',
            'zona',
            'desc_zona',
            'porc_descto',
            'prod_chavin',
            'cod_procedimiento',
            'producto_sunat',
            'motivo_ajuste',
            'cod_user',
            'des_user',
            'familia',
            'sub_familia',
            'numeropedido',
            'importecoaseguro',
            'montocompania',
            'tipopreciofijo',
            'anyo_chv',
            'asien_ch',
            'flag_conta',
            'stkm_tabori',
            'stkm_cabori',
            'stkm_linori',
            'ctacon_exi',
            'ctacon_con',
            'centro_coste'
        ]);
        options.setColumnTypes([
            Ax.sql.Types.INTEGER,
            Ax.sql.Types.INTEGER,
            Ax.sql.Types.INTEGER,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.DATE,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.DATE,
            Ax.sql.Types.DATE,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.DATE,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.DOUBLE,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.INTEGER,
            Ax.sql.Types.INTEGER,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR,
            Ax.sql.Types.CHAR
        ]);
    });

    if (pStrExcel == 'S') {

        for (let row of rsKardex) {
            row.producto = (row.producto) ? '\t' + row.producto : null;
            row.familia_n2 = (row.familia_n2) ? '\t' + row.familia_n2 : null;
            row.familia_n5 = (row.familia_n5) ? '\t' + row.familia_n5 : null;
            row.ruc = (row.ruc) ? '\t' + row.ruc : null;
            row.nrodoc = (row.nrodoc) ? '\t' + row.nrodoc : null;
            row.operacion = (row.operacion) ? '\t' + row.operacion : null;
            row.tipo_trx = (row.tipo_trx) ? '\t' + row.tipo_trx : null;
            row.familia = (row.familia) ? '\t' + row.familia : null;
            row.sub_familia = (row.sub_familia) ? '\t' + row.sub_familia : null;

            rs3.rows().add([
                row.priori,
                row.valord,
                row.ordqry,
                row.periodo,
                row.producto,
                row.des_producto,
                row.bodega,
                row.cuenta,
                row.origen_destino,
                row.cuenta_destino,
                row.tipodocto,
                row.correlativo,
                row.tipologia,
                row.numero,
                row.numeroguia,
                row.nro_guia_chavin,
                row.fecdoc,
                row.hora,
                row.ruc,
                row.razon_social,
                row.tipdoc,
                row.serdoc,
                row.nrodoc,
                row.fecdoccp,
                row.unimed,
                row.unimed_sunat,
                row.operacion,
                row.tipo_trx,
                row.desc_trx,
                row.tipo_transferencia,
                row.can_ing,
                row.cos_ing,
                row.tot_ing,
                row.can_egr,
                row.cos_egr,
                row.tot_egr,
                row.can_saldo,
                row.cos_saldo,
                row.tot_saldo,
                row.can_ini,
                row.cos_ini,
                row.tot_ini,
                row.can_fin,
                row.cos_fin,
                row.tot_fin,
                row.imp_total,
                row.can_total,
                row.costo,
                row.afecto_igv,
                row.precio,
                row.porcentajedr,
                row.precioajustado,
                row.subtotal,
                row.igv,
                row.total,
                row.tipdoc_ant,
                row.nrodoc_ant,
                row.fecdoc_ant,
                row.dni_paciente,
                row.nombre_paciente,
                row.cod_cen_trab,
                row.des_cen_trab,
                row.financiador,
                row.tipoventa,
                row.plataforma,
                row.historia_cli,
                row.nro_admision,
                row.fec_admision,
                row.fec_alta,
                row.medico_trata,
                row.especialidad,
                row.modalidad_pago,
                row.nro_asiento_declarado,
                row.cod_establecimiento,
                row.catalogo,
                row.tipexist,
                row.met_val,
                row.nro_liq,
                row.tip_doc_copago,
                row.ser_doc_copago,
                row.nro_doc_copago,
                row.fec_doc_copago,
                row.tipo_producto,
                row.pto_consumo,
                row.zona,
                row.desc_zona,
                row.porc_descto,
                row.prod_chavin,
                row.cod_procedimiento,
                row.producto_sunat,
                row.motivo_ajuste,
                row.cod_user,
                row.des_user,
                row.familia,
                row.sub_familia,
                row.numeropedido,
                row.importecoaseguro,
                row.montocompania,
                row.tipopreciofijo,
                row.anyo_chv,
                row.asien_ch,
                row.flag_conta,
                row.stkm_tabori,
                row.stkm_cabori,
                row.stkm_linori,
                row.ctacon_exi,
                row.ctacon_con,
                row.centro_coste
            ]);
        }

        var blob = new Ax.sql.Blob('Kardex_completo.csv');
        new Ax.rs.Writer(rs3).csv(options => {
            options.setCharset('ISO-8859-1');
            options.withQuote('"');                 // Character used to quote fields
            options.withQuoteMode('NON_NUMERIC');   // Quote all non numeric fields: ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC, NONE

            options.setDelimiter('|');
            options.getFormats().setNumberFormat('numdec_es', '##.##', 'es');

            options.setResource(blob);

            // Add a header for Excel to allow it recognises file as CSV
            options.setHeaderText('sep=' + options.getDelimiter());
        });

        return blob;

    } else if (pStrExcel == 'N') {

        for (let row of rsKardex) {
            rs3.rows().add([
                row.priori,
                row.valord,
                row.ordqry,
                row.periodo,
                row.producto,
                row.des_producto,
                row.bodega,
                row.cuenta,
                row.origen_destino,
                row.cuenta_destino,
                row.tipodocto,
                row.correlativo,
                row.tipologia,
                row.numero,
                row.numeroguia,
                row.nro_guia_chavin,
                row.fecdoc,
                row.hora,
                row.ruc,
                row.razon_social,
                row.tipdoc,
                row.serdoc,
                row.nrodoc,
                row.fecdoccp,
                row.unimed,
                row.unimed_sunat,
                row.operacion,
                row.tipo_trx,
                row.desc_trx,
                row.tipo_transferencia,
                row.can_ing,
                row.cos_ing,
                row.tot_ing,
                row.can_egr,
                row.cos_egr,
                row.tot_egr,
                row.can_saldo,
                row.cos_saldo,
                row.tot_saldo,
                row.can_ini,
                row.cos_ini,
                row.tot_ini,
                row.can_fin,
                row.cos_fin,
                row.tot_fin,
                row.imp_total,
                row.can_total,
                row.costo,
                row.afecto_igv,
                row.precio,
                row.porcentajedr,
                row.precioajustado,
                row.subtotal,
                row.igv,
                row.total,
                row.tipdoc_ant,
                row.nrodoc_ant,
                row.fecdoc_ant,
                row.dni_paciente,
                row.nombre_paciente,
                row.cod_cen_trab,
                row.des_cen_trab,
                row.financiador,
                row.tipoventa,
                row.plataforma,
                row.historia_cli,
                row.nro_admision,
                row.fec_admision,
                row.fec_alta,
                row.medico_trata,
                row.especialidad,
                row.modalidad_pago,
                row.nro_asiento_declarado,
                row.cod_establecimiento,
                row.catalogo,
                row.tipexist,
                row.met_val,
                row.nro_liq,
                row.tip_doc_copago,
                row.ser_doc_copago,
                row.nro_doc_copago,
                row.fec_doc_copago,
                row.tipo_producto,
                row.pto_consumo,
                row.zona,
                row.desc_zona,
                row.porc_descto,
                row.prod_chavin,
                row.cod_procedimiento,
                row.producto_sunat,
                row.motivo_ajuste,
                row.cod_user,
                row.des_user,
                row.familia,
                row.sub_familia,
                row.numeropedido,
                row.importecoaseguro,
                row.montocompania,
                row.tipopreciofijo,
                row.anyo_chv,
                row.asien_ch,
                row.flag_conta,
                row.stkm_tabori,
                row.stkm_cabori,
                row.stkm_linori,
                row.ctacon_exi,
                row.ctacon_con,
                row.centro_coste
            ]);
        }

        return rs3;
    }
}