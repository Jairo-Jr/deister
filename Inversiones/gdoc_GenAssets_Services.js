/*
 * FUNCIONES
 * 
 * PARAM
 *      pIntCabid       Id de la cabecera
 *      mArrAssetSrc    Arreglo de objeto cabecera+linea
 */


/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
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
 * -----------------------------------------------------------------------------
 * 
 * 
 *  JS:  iterate_and_generate_comp
 * 
 *  Version     : 1.0
 *  Date        : 28-04-2023
 *  Description : Construcción de arreglo de objetos con la estructura 
 *                de cabecera y lineas de factura de compras FMAN/FSER
 * 
 * 
 *  LOCAL FUNCTIONS:
 *  ==================
 *          __getDataHeader
 *          __getDataLines
 * 
 * 
 *  CALLED FROM:
 *  ==================
 * 
 * 
 *  PARAMETERS:
 *  ==================
 *          pIntCabids
 * 
 * 
 **/
function gdoc_GenAssets_Services (pIntCabid, mArrAssetSrc) {
    var pStrTabname = 'gcomfach';
    var pStrTabline = 'gcomfacl';
    var mIntPorcen = 0;

    /**
     * LOCAL FUNCTION: __getAreaDestino
     * 
     * Función local que obtienes el área destino de la solicitud     
     * 
     *      @param   {integer}   pIntCabid       Id. de la factura    
     */ 
    function __getAreaDestino(pIntCabid) {
        
        var mStrDepartSol = Ax.db.executeGet (`
            <select>
                <columns>
                    FIRST 1
                    NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol
                </columns>
                <from table='gcomsoll'>
                    <join table='gcomsolh'>
                        <on>gcomsoll.cabid = gcomsolh.cabid</on>
                        <join table='gcomsold'>
                            <on>gcomsolh.tipdoc = gcomsold.codigo</on>
                        </join>
                    </join>
                    <join table='gcompedl_lnk'>
                        <on>gcompedl_lnk.lnk_cabori  = gcomsoll.cabid</on>
                        <on>gcompedl_lnk.lnk_linori  = gcomsoll.linid</on>
                        <join table='gcompedl'>
                            <on>gcompedl_lnk.lnk_tabori = 'gcomsolh'</on>
                            <on>gcompedl_lnk.linid   = gcompedl.linid</on>
                            <join table='gcompedh'>
                                <on>gcompedl.cabid = gcompedh.cabid</on>
                                <join table='gcomalbl'>
                                    <on>gcomalbl.cabori = gcompedl.cabid</on>
                                    <on>gcomalbl.tabori = 'gcompedh'</on>
                                        <join table='gcomalbh'>
                                        <on>gcomalbl.cabid = gcomalbh.cabid</on>
                                        <join table='gcomfacl'>
                                            <on>gcomalbl.cabid = gcomfacl.cabori</on>
                                            <on>gcomfacl.tabori = 'gcommovh'</on>
                                        </join>
                                    </join>
                                </join>
                            </join>
                        </join>
                    </join>
                </from>
                <where>
                        gcomsold.circui = 'LOG'
                    AND gcomsolh.estcab = 'V'
                    AND gcomfacl.cabid  = ?
                </where>
            </select>
        `, pIntCabid);

        var mStrSeccion = Ax.db.executeGet(`
            SELECT gdeparta.seccio
              FROM gdeparta
             WHERE gdeparta.depart = ?
        `, mStrDepartSol);     
        
        return mStrSeccion;
    }

    /*
     * DEFINICION DE VARIABLES LOCALES
     */
    var mStrTabdatc     = pStrTabline + "_datc";
    var mObjAddonsData  = {};
    var mStrAreaDestino = '';
    /**
     * Estructura con la información requerida para generar los activos fijos.
     **/
    var mObjCinmdata = {
        empcode : null,                                         // Company
        codinm  : null,                                         // Property
        serele  : null,                                         // Element/series code
        nomele  : null,                                         // Element/component name.
                                                                                                 
        codcta  : null,                                         // Accounting group
        proyec  : null,                                         // Project
        seccio  : null,                                         // Section
        ctaexp  : null,                                         // Operating account
        centro  : null,                                         // Center  

        codgru  : null,                                         // Fiscal group
        codfis  : null,                                         // Fiscal Code
        
        sisamo  : null,                                         // Amortization system
        codpre  : null,                                         // Budget
        codpar  : null,                                         // Partida

        fecha   : null,                                         // Registration date
        fecdoc  : null,                                         // Delivery note or invoice date
        fecini  : null,                                         // Amortization start date
        jusser  : null,                                         // Voucher
        docser  : null,                                         // Document
        refter  : null,                                         // Reference
        tercer  : null,                                         // Third company
        unidad  : null,                                         // Unit
        valinv  : null,                                         // Inventory value

        tabname : null,
        docid   : null,
        divisa  : null,                                         // Currency invoice
        cambio  : null,                                         // Money exchange
        impfac  : null                                          // Invoice amount
    }

    // Objeto con datos adicionales de la cabecera
    mObjAddonsData = Ax.db.executeQuery(`
        SELECT  gcomfach.divisa,
                gcomfach.cambio,
                gcomfach.impfac
          FROM  gcomfach
         WHERE  gcomfach.cabid = ?
    `, pIntCabid).toOne();

    // console.log(mObjAddonsData);

    /* AREA DESTINO - PENDIENTE */
    mStrAreaDestino = __getAreaDestino(pIntCabid);
    // console.log(mStrAreaDestino);

    // Procesar rs con datos de origen necesarios para generar los activos fijos.
    mArrAssetSrc.forEach(mObjAssetSrc => {
        console.log('Objeto H-L', mObjAssetSrc);

        /**
         * Tipo del componente
        */
        var mArrTipComp =  Ax.db.executeQuery(`
            <select>
                <columns>
                    tipcom, 
                    id_cinmcomp seqno, 
                    porcen
                </columns>
                <from table='gcomfacl_dist_cinmcomp'/>
                <where>
                    linid = ?
                </where>
            </select>
        `, mObjAssetSrc.docid).toJSONArray();
        // console.log('Tip. Componente', mArrTipComp);

        
        

        mArrTipComp.forEach(mStrTipComp => {
            mIntPorcen = mStrTipComp.porcen;

            var mObjDataComp =  Ax.db.executeQuery(`
                <select first='1'>
                    <columns>
                        codinm,codele
                    </columns>
                    <from table='cinmcomp'/>
                    <where>
                        seqno = ?
                    </where>
                </select>
            `, mStrTipComp.seqno).toOne();

            // console.log(mObjDataComp);
            mObjAddonsData.tipcom       = mStrTipComp.tipcom;
            // console.log(mObjAddonsData);
            
            mObjCinmdata.empcode = mObjAssetSrc.empcode;        // empcode
            mObjCinmdata.codinm  = mObjDataComp.codinm          // codinm
            mObjCinmdata.serele  = mObjDataComp.codele;         // codele
            mObjCinmdata.nomele  = mObjAssetSrc.desvar;         // nomele
    
            mObjCinmdata.codcta  = mObjAssetSrc.gartfami_codcta;// codcta
            mObjCinmdata.proyec  = mObjAssetSrc.gdeparta_proyec;// proyec *
            mObjCinmdata.seccio  = mStrAreaDestino || mObjAssetSrc.gdeparta_seccio;// seccio
            mObjCinmdata.ctaexp  = mObjAssetSrc.gdeparta_ctaexp;// ctaexp *
            mObjCinmdata.centro  = mObjAssetSrc.gdeparta_Centro;// centro *
    
            mObjCinmdata.codgru  = mObjAssetSrc.gartfami_codgru;// codgru
            mObjCinmdata.codfis  = mObjAssetSrc.gartfami_codfis;// codfis
                
            mObjCinmdata.sisamo  = mObjAssetSrc.gartfami_sisamo;// sisamo
            mObjCinmdata.codpre  = mObjAssetSrc.codpre;         // codpre *
            mObjCinmdata.codpar  = mObjAssetSrc.codpar;         // codpar *
    
            mObjCinmdata.fecha   = mObjAssetSrc.fecha;          // fecha
            mObjCinmdata.fecdoc  = mObjAssetSrc.fecha;          // fecdoc
            mObjCinmdata.fecini  = mObjAssetSrc.fecha;          // fecini * primer dia del sgt mes
            mObjCinmdata.jusser  = mObjAssetSrc.docser;         // jusser
            mObjCinmdata.docser  = mObjAssetSrc.docser;         // docser
            mObjCinmdata.refter  = mObjAssetSrc.refter;         // refter
            mObjCinmdata.tercer  = mObjAssetSrc.tercer;         // tercer
            mObjCinmdata.unidad  = mIntPorcen * mObjAssetSrc.canfac / 100;                           // unidad *
            mObjCinmdata.valinv  = mIntPorcen * mObjAssetSrc.impfac / 100;                           // valinv *
    
            mObjCinmdata.tabname = pStrTabline;                 // tabname
            mObjCinmdata.docid   = mObjAssetSrc.docid;          // docid

            console.log('Param-1:', mObjCinmdata);
            console.log('Param-2', mObjAddonsData);
            Ax.db.call('crp_cinmelemGenera', mObjCinmdata, mObjAddonsData);
        });

    });

}