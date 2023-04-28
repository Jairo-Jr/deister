// Identificador de la cabecera
var pIntCabid = 14602;
// var pIntCabid = 14683;

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
 *  JS:  gen_structure_header_lines
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

function gen_structure_header_lines(pIntCabid) { 
    
    /*
    * DECLARACION DE FUNCIONES LOCALES
    */
    function __getDataHeader(pIntCabid) {
        /**
         * Get data from gcomfach
        **/
        var mObjGcomfach = Ax.db.executeQuery(`
            <select>
                <columns>
                    'INV' tipo_proceso,
                    gcomfach.cabid,
                    gcomfach.empcode,
                    gcomfach.docser,
                    gcomfach.fecha,
                    gcomfach.estcab,
                    gcomfach.date_contab,
                    gcomfach.tercer,
                    gcomfach.dtogen,
                    gcomfach.codpre,
                    gcomfach.codpar,
                    gcomfach.tipdoc,
                    gcomfach.delega,
                    gcomfach.depart,
                    gcomfach.tipdir,
                    gcomfach.refter,
                    gcomfach.dockey,
                    gcomfach.impfac,
                    gdeparta.proyec  gdeparta_proyec,
                    gdeparta.seccio  gdeparta_seccio,
                    gdeparta.ctaexp  gdeparta_ctaexp,
                    gdeparta.centro  gdeparta_centro
                </columns>
                <from table='gcomfach'>
                    <join type='left' table='gdeparta'>
                        <on>gcomfach.delega = gdeparta.delega</on>
                        <on>gcomfach.depart = gdeparta.depart</on>
                    </join>
                </from>
                <where>
                    gcomfach.cabid = ?
                </where>
            </select>
        `, pIntCabid).toOne().setRequired(`gcomfach.cabid = ${pIntCabid} not found`);

        return mObjGcomfach;
    }

    function __getDataLines(pIntCabid, pIntImpfac) {
        var mArrLines = [];
        var mIntPorcent = 0;
        var mArrErrorLines = [];
        /**
         * Get data from gcomfacl
        **/
        var mRsGcomfacl =  Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomfacl.linid, 
                    gcomfacl.codart,
                    gcomfacl.varlog,
                    gcomfacl.canfac,
                    gcomfacl.impnet,
                    gcomfacl.desvar,
                    gcomfacl.orden,
                    gcomfacl.canfac,
                    garticul.nomart garticul_nomart,
                    gartfami.agrele gartfami_agrele,
                    gartfami.codinm gartfami_codinm, 
                    gartfami.serele gartfami_serele,
                    gartfami.codcta gartfami_codcta,
                    gartfami.codgru gartfami_codgru, 
                    gartfami.codfis gartfami_codfis,
                    gartfami.sisamo gartfami_sisamo
                </columns>
                <from table='gcomfacl'>
                    <join table='garticul'>
                        <on>gcomfacl.codart = garticul.codigo</on>
                    </join>
                    <join table='gartfami'>
                        <on>garticul.codfam = gartfami.codigo</on>
                    </join>
                </from>
                <where>
                    gcomfacl.cabid = ?
                </where>
            </select>
        `, pIntCabid).toJSONArray();

        mRsGcomfacl.forEach(objLines => {

            var existCmp = Ax.db.executeQuery(`
                <select>
                    <columns>
                        id_cinmcomp,
                        porcen
                    </columns>
                    <from table='gcomfacl_dist_cinmcomp'/>
                    <where>
                        linid = ?
                    </where>
                </select>
            `, objLines.linid).toJSONArray();

            if(existCmp.length > 0) {
                mIntPorcent = 0;
                existCmp.forEach(item => {
                    mIntPorcent += item.porcen
                    if (mIntPorcent>100){
                        mArrErrorLines.push(objLines.linid)
                    }
                })
                mArrLines.push(objLines);
            }
            // console.log('L->', objLines);
        });
        // console.log(mArrErrorLines);
        if(mArrErrorLines.length > 0) {
            throw `Las lineas superan el 100% para los componentes asignados: [${mArrErrorLines}].`;
        }
        return mArrLines;
    }

    /*
    * DECLARACION DE VARIABLES GLOBALES
    */
    var mArrAssetSrc = [];
    var mIntExistDatc = 0;

    /*
    * INICIO DE LA TRANSACCION
    */

    // Obtiene datos de la cabecera
    var mObjGcomfach = __getDataHeader(pIntCabid);
    // console.log(mObjGcomfach);

    // Obtiene datos de la linea con componentes asignados
    var mArrDataLines = __getDataLines(pIntCabid, mObjGcomfach.impfac);

    console.log('Num. Lineas', mArrDataLines.length);

    // Si existen lineas con componentes asignados
    if (mArrDataLines.length > 0) {
        console.log('Con componentes asignados');
        
        mArrDataLines.forEach(mRowGcomfacl => {
            mIntExistDatc = 0;
            // console.log(mRowGcomfacl);
            // if (mRowGcomfacl.gartfami_codinm != null) {
                /**
                 * En caso de ser una línea por redondeo, se omite
                 **/
                if (mRowGcomfacl.orden == -999){
                    return;
                }
                
                /**
                 * Validar si existe datos contables asociados a 
                 * las líneas.
                 **/
                var mIntCountExistDatc = Ax.db.executeGet(`
                    SELECT COUNT(*)
                    FROM gcomfacl_datc
                    WHERE gcomfacl_datc.linid = ?
                `, mRowGcomfacl.linid);
                
                if(mIntCountExistDatc >0){ mIntExistDatc = 1}

                // Creacion de arreglo de objetos
                mArrAssetSrc.push({
                    tipo_proceso     :  mObjGcomfach.tipo_proceso,
                    empcode          :  mObjGcomfach.empcode, 
                    tipdoc           :  mObjGcomfach.tipdoc,          
                    delega           :  mObjGcomfach.delega,         
                    depart           :  mObjGcomfach.depart,         
                    fecha            :  mObjGcomfach.fecha,         
                    tercer           :  mObjGcomfach.tercer,         
                    tipdir           :  mObjGcomfach.tipdir,         
                    terenv           :  mObjGcomfach.tercer,        
                    direnv           :  mObjGcomfach.tipdir,        
                    docser           :  mObjGcomfach.docser,         
                    refter           :  mObjGcomfach.refter,         
                    dtogen           :  mObjGcomfach.dtogen,         
                    codpre           :  mObjGcomfach.codpre,         
                    codpar           :  mObjGcomfach.codpar,         
                    dockey           :  mObjGcomfach.dockey,
                    impfac           :  mObjGcomfach.impfac,
                    gdeparta_proyec  :  mObjGcomfach.gdeparta_proyec,     
                    gdeparta_seccio  :  mObjGcomfach.gdeparta_seccio,
                    gdeparta_ctaexp  :  mObjGcomfach.gdeparta_ctaexp,
                    gdeparta_centro  :  mObjGcomfach.gdeparta_centro, 
                                        
                    docid            :  mRowGcomfacl.linid,                   
                    codart           :  mRowGcomfacl.codart,                   
                    varlog           :  mRowGcomfacl.varlog,
                    canmov           :  mRowGcomfacl.canfac,
                    impnet           :  mRowGcomfacl.impnet,
                    canfac           :  mRowGcomfacl.canfac,
                    desvar           :  mRowGcomfacl.desvar || mRowGcomfacl.garticul_nomart,
                    exist_datc       :  mIntExistDatc != 0 ? mIntExistDatc : mRowGcomfacl.exist_datc,
                    gartfami_codinm  :  mRowGcomfacl.gartfami_codinm,
                    gartfami_serele  :  mRowGcomfacl.gartfami_serele,
                    gartfami_agrele  :  mRowGcomfacl.gartfami_agrele,
                    gartfami_codcta  :  mRowGcomfacl.gartfami_codcta,
                    gartfami_codgru  :  mRowGcomfacl.gartfami_codgru,
                    gartfami_codfis  :  mRowGcomfacl.gartfami_codfis,
                    gartfami_sisamo  :  mRowGcomfacl.gartfami_sisamo
                });

            // }
        });

        if (mArrAssetSrc.length > 0) {
            console.log('Enviar a generar elementos y componentes');
            // console.log(mArrAssetSrc[0]);
            /**
             * Genera elementos y componentes de activos fijos.
            **/
            // Ax.db.call("gdoc_GenAssets", "gcomfach", "gcomfacl", pIntCabid, mArrAssetSrc);
            generateElemCompActFijo(pIntCabid, mArrAssetSrc);

        }
    } else {
        console.log('Sin componentes asignados');
    }
    
} 