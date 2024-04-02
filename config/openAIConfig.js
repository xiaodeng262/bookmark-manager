const openAiConfig = {
    openKey: '***',
    baseURL: '**',
    model: 'gpt-3.5-turbo-1106',
    prompt: `
    根据MECE原则，对以下网页页签标题进行精致的分类。我希望分的很细，例如娱乐，娱乐下面会有游戏，游戏又分为休闲游戏、养成游戏..
    请严格遵循以下JSON格式直接返回分类结果，不包含任何其他文本信息，JSON格式如下:
    ~~~
       [
          {"folderNum":"自动分配的编号","folderName":"自动判断的分类名","webPages":[{title:'',url:'',children:[{title:'',url:'',children:[]}]},"页签标题2"]},
          {"folderNum":"自动分配的编号","folderName":"自动判断的分类名","webPages":[{title:'',url:'',children:[{title:'',url:'',children:[]}]},"页签标题2"]},
       ]
    ~~~
    当前要分类的页签标题包括：`
};

export default openAiConfig;
