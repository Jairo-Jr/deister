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
 *  "Confidentiality and Non-disclosure" agreements explicitly covering such access.
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
 *   JS: gcomfach_GenAssets
 *      Version:    V1.5                      
 *      Date:       08-06-2023
 *      Description:
 *
 *			Intermediate script to obtain header and line data of the invoice. 
 *
 *      CALLED FROM:
 *      ============ 
 *       XSQL gcomfach_contab1                            Post a purchase invoice.
 *
 *      PARAMETERS:
 *      ==============
 *          @param      {integer}       pIntCabid         Header identifier
 *
 */

 function gcomfach_GenAssets(pIntCabid) {

    /**
     * Get data from gcomfach
    **/
    var mObjGcomfach = Ax.db.executeQuery(`
        <select>
            <columns>
                'AF' tipo_proceso,
                gcomfach.cabid,
                gcomfach.empcode,
                gcomfach.docser,
                gcomfach.feccon fecha,
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
                gcomfach.divisa,
                gcomfach.cambio,
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
                gcomfacl.auxnum2 linid_father,
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
            <order>
                linid_father ASC
            </order>
        </select>
    `, pIntCabid);
    
    var mArrAssetSrc  = [];
    var mIntExistDatc = 0;

    for(var mRowGcomfacl of mRsGcomfacl){
        
        if (mRowGcomfacl.gartfami_codinm != null) {
            
            /**
             * En caso de ser una línea por redondeo, se omite
             **/
            if (mRowGcomfacl.orden == -999){
                continue;
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
                divisa           :  mObjGcomfach.divisa,
                cambio           :  mObjGcomfach.cambio,
                gdeparta_proyec  :  mObjGcomfach.gdeparta_proyec,     
                gdeparta_seccio  :  mObjGcomfach.gdeparta_seccio,
                gdeparta_ctaexp  :  mObjGcomfach.gdeparta_ctaexp,
                gdeparta_centro  :  mObjGcomfach.gdeparta_centro, 
                                    
                docid            :  mRowGcomfacl.linid,                   
                codart           :  mRowGcomfacl.codart,
                linid_father     :  mRowGcomfacl.linid_father,
                varlog           :  mRowGcomfacl.varlog,
                canmov           :  mRowGcomfacl.canfac,
                impnet           :  mRowGcomfacl.impnet,
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
        } 
    }
    
    mRsGcomfacl.close();
    
    /**
     * validate that the array contains data
    **/
    if (!mArrAssetSrc || mArrAssetSrc.length == 0) {
        return;
    }
    
    /**
     * It generates elements and components of fixed assets.
    **/
    Ax.db.call("gdoc_GenAssets", "gcomfach", "gcomfacl", pIntCabid, mArrAssetSrc); 

}