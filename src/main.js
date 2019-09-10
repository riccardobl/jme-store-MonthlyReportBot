const Fs = require('fs');
const Fetch = require("node-fetch");
const Settings=require("./data/settings.json");
const Dateformat = require('dateformat');

console.log("Starting ...");


function loadData(){
    var data;
    if(Fs.existsSync("data/data.json")){
        let content=Fs.readFileSync("data/data.json","utf8").trim();
        if(content!=""){
            console.log("Load data...",content);
            data=JSON.parse(content);
        }
    }
    if(!data){
        data={};
        console.log("Data not found... start from scratch...");
    }
    return data;
}

function saveData(data){
    Fs.writeFileSync("data/data.json",JSON.stringify(data),"utf8");
}


async function collectLastAssets(fromDate){
    const assets=[];
    let page=0;
    do{
        console.log("Fetch page",page);            
        const json=await Fetch("https://jmonkeystore.com/api/search/?categoryId=-1&title=&tag=&author=&orderBy=created&direction=descending&page="+page).then(res => res.json());
        const content=json["content"];
        if(content.length==0)return assets;
        for(let i in content){
            const asset=content[i];
            const dateCreated=asset["dateCreated"];
            if(dateCreated<=fromDate)return assets;
            assets.push({
                name:asset["details"]["title"],
                desc:asset["details"]["shortDescription"],
                author:asset["owner"]["username"],
                id:asset["id"] ,
                date:asset["dateCreated"],
                rating:asset["rating"]["averageRating"]  ,        
                images:asset["mediaLinks"]["imageIds"].split(",")          
            }); 
        }
        page++;
    }while(true);  
}


async function main(){
    const date=Dateformat(new Date(),Settings.dateFromat);

    const data=loadData();
    // let lastId=data["lastId"]; if(!lastId) lastId="none";
    let lastDate=data["lastDate"]; if(!lastDate)lastDate=0;

    const assets=await collectLastAssets(lastDate);

    if(assets.length==0){
        console.log("Nothing to do. No new assets")
    }else{
        console.log("Found",assets.length,"new assets");
        console.log(assets);

        let report = "";
        report+=(Settings.mdTitle.replace("$DATE",date)+"\n\n");

        
        const assetsSortedByRating=[...assets].sort((a,b)=>b.rating-a.rating);
        const n=Math.min(Settings.imagesPerReport,assetsSortedByRating.length);
        const w=Settings.postOnDiscourse?Settings.discourseWidth/n:(100/n)+"%";
    
        report+=("________\n\n")
        if(Settings.postOnDiscourse)report+=("<div align='center'>\n\n");
        for(let i=0;i<n;i++){
            const asset=assetsSortedByRating[i];
            report+=("[<img title='"+asset.name+"' alt='"+asset.name+"' src='"+
                Settings.imageUrl.replace("$ID",asset.images[0])+
            "' width='"+w+"' />]("+
            Settings.assetUrl.replace("$ID",asset.id)
            +")");
        }
        if(Settings.postOnDiscourse)report+=("\n\n</div>\n\n");
        report+=("________\n\n")


        for(let i in assets){
            const asset=assets[i];
            
            const line="**["+asset.name+"]("+
            Settings.assetUrl.replace("$ID",asset.id)
            +")**:  "+asset.desc+" - *"+asset.author+"*\n\n";
          
            console.log("Write in report",line);
            report+=(line);
        }
        
        report+=Settings.footer;

        const reportFile=Fs.createWriteStream("data/report.md");
        reportFile.write(report);
        reportFile.end();

        if(Settings.postOnDiscourse){
            let key=Settings.discourseApiKey;
            let username=Settings.discourseApiUsername;
            if(key==="env"){
                key=process.env["API_KEY"];
            }
            if(username==="env"){
                username=process.env["API_USER"];
            }
            if(username==""||key==""){
                console.log("Please configure the api key and username. Skip post.")
            }else{
                console.log("Post with username "+username)
                const status=await Fetch(Settings.discoursePostEndPoint, {
                    method: 'post',
                    body:    JSON.stringify({
                        title:Settings.title.replace("$DATE",date),
                        category:Settings.discourseCategoryId,
                        raw: report
                    }),
                    headers: { 
                        "Content-Type": "application/json",
                        "Api-Key": key,
                        "Api-Username":username
                    },
                })
                .then(res => res.json())
                if(status.status!=200){
                    console.log(status);
                    throw new Error("Can't post on discourse");
                }
            }
        }

        data["lastDate"]=assets[0].date;
        saveData(data);
    }




}



main();

