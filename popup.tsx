import React, {useEffect, useState} from "react";
import {Button, message, Tooltip, TreeSelect} from 'antd';
import {GithubOutlined, PoweroffOutlined} from "@ant-design/icons";
import OpenAI from "openai";
import openAIConfig from './config/openAIConfig';
import openAiConfig from "./config/openAIConfig";
import * as timers from "timers";

const Popup = () => {
    // 用于存储转换后的书签数据
    const [treeData, setTreeData] = useState([]);
    const [foldersAndTabs, setFoldersAndTabs] = useState([]);
    const [selectFolders, setSelectFolders] = useState(undefined); // 用于存储 `TreeSelect` 的选中值
    const [selectFoldersName, setSelectFoldersName] = useState(undefined); // 用于存储 `TreeSelect` 的选中值
    const [selectedBookmarkCount, setSelectedBookmarkCount] = useState(0);
    const [loadings, setLoadings] = useState<boolean[]>([]);
    const [buttMes, setButtMes] = useState(0); // 定义 buttMes 状态

    // 递归函数，用于将书签数据转换为 TreeSelect 需要的格式
    const formatBookmarkData = (nodes) => {


        return nodes.reduce((acc, node) => {
            // 检查节点是否有 URL，如果有，则表示它是一个书签而不是文件夹
            const isBookmark = !!node.url;
            if (!isBookmark && node.children) {
                acc.push({
                    title: node.title,
                    value: node.id,
                    // 递归调用以转换子节点
                    children: formatBookmarkData(node.children)
                });
            }
            return acc;
        }, []);
    };

    const collectFoldersAndTabs = (nodes) => {
        // 初始化一个空数组来存储结果
        let result = [];

        // 递归函数，用于遍历书签节点
        const traverseNodes = (nodes, parentFolder = null) => {
            nodes.forEach(node => {
                // 检查节点是否有 URL，如果有，则表示它是一个书签而不是文件夹
                const isBookmark = !!node.url;

                if (isBookmark) {
                    // 如果是书签，并且有父文件夹，将书签添加到父文件夹的页签列表中
                    if (parentFolder) {
                        parentFolder.tabs.push({title: node.title, url: node.url}); // 使用书签的标题，也可以根据需要存储其他信息
                    }
                } else {
                    // 如果是文件夹，创建一个新对象来存储文件夹信息和它的页签
                    const folder = {
                        folder: node.title,
                        id: node.id,
                        tabs: []
                    };

                    // 将该文件夹对象添加到结果数组中
                    result.push(folder);

                    // 递归调用，处理当前文件夹下的所有子节点
                    if (node.children) {
                        traverseNodes(node.children, folder);
                    }
                }
            });
        };

        // 使用定义好的递归函数开始遍历
        traverseNodes(nodes);

        return result;
    };

    useEffect(() => {
        // 调用chrome.bookmarks API获取收藏夹
        chrome.bookmarks.getTree((bookmarkTreeNodes) => {
            // 通常顶级节点是数组的第一个元素，我们从它的子节点开始处理
            const rootNodes = bookmarkTreeNodes[0].children || [];
            const formattedData = formatBookmarkData(rootNodes);
            setTreeData(formattedData);

            const foldersAndTabs = collectFoldersAndTabs(rootNodes);
            setFoldersAndTabs(foldersAndTabs)
        });
    }, []);

    const onChange = (value) => {
        setSelectFoldersName(value);
        const findNode = foldersAndTabs.find(node => node.id == value) || null
        setSelectFolders(findNode)
        if (findNode) {
            setSelectedBookmarkCount(findNode.tabs.length);
        } else {
            setSelectedBookmarkCount(0);
        }

    };

    const labelOrganization = async (index: number, folders: any) => {
        try {
            console.log(folders)
            if (folders == null || folders.length == 0) {
                message.error('请选择需要整理的收藏夹!');
                return;
            }
            setButtMes(1)
            const rq = await sentOpenAI(folders);
            const bookmarks = JSON.parse(rq.replace("```json", "").replace("```", "").trim());
            console.log(bookmarks)
            for (const folder of bookmarks) {
                // 首先创建文件夹
                const createdFolder = await chrome.bookmarks.create({
                    title: folder.folderName
                });
                // 然后在该文件夹下创建书签
                for (const webPage of folder.webPages) {
                    await chrome.bookmarks.create({
                        parentId: createdFolder.id,
                        title: webPage.title,
                        url: webPage.url
                    });
                }
            }
            setButtMes(2)
            console.log(buttMes)
            setTimeout(() => {
                setButtMes(0);
            }, 2000);
        } catch (error) {
            console.error("Error in labelOrganization:", error);
            setButtMes(3)
            setTimeout(() => {
                setButtMes(0);
            }, 2000);
        }
    }

    const sentOpenAI = async (folders: object) => {
        try {
            const prompt = openAiConfig.prompt + JSON.stringify(folders, null, 2); // 格式化 JSON 字符串以提高可读性
            console.log(prompt);
            const openai = new OpenAI({
                apiKey: openAiConfig.openKey,
                baseURL: openAiConfig.baseURL,
                dangerouslyAllowBrowser: true, // 确保你理解了启用这个选项的含义和风险
            });
            const completion = await openai.chat.completions.create({
                messages: [{"role": "system", "content": prompt}],
                model: openAiConfig.model
            });
            return completion.choices[0].message.content;
        } catch (error) {
            console.error("Error in sentOpenAI:", error);
            throw error; // 抛出错误以便调用方可以处理
        }
    }


    const handleIconClick = () => {
        // 使用 window.open 打开新的标签页跳转到指定的 GitHub 页面
        window.open('https://github.com/xiaodeng262/bookmark-manager', '_blank');
    };

    const getButtonText = () => {
        switch (buttMes) {
            case 0:
                return '开始整理';
            case 1:
                return '整理中';
            case 2:
                return '整理完成';
            case 3:
                return '整理失败';
            default:
                return '开始整理';
        }
    };


    return (
        <div style={{
            width: '300px',
            height: '350px',
            padding: '20px',
            position: 'relative', // 添加这行以使容器具有相对定位
            border: '1px solid #d9d9d9',
            borderRadius: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            backgroundColor: '#fff'
        }}>
            <div style={{marginBottom: '20px'}}>
                <span style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '10px'
                }}>请选择需要整理的收藏夹:</span>
                <TreeSelect
                    style={{width: '100%', minHeight: '40px', fontSize: '14px', borderRadius: '4px'}}
                    showSearch
                    disabled={buttMes != 0}
                    value={selectFoldersName}
                    dropdownStyle={{overflow: 'auto'}}
                    placeholder="Please select"
                    allowClear
                    treeDefaultExpandAll
                    onChange={onChange}
                    treeData={treeData}
                />
            </div>
            <div style={{
                marginTop: '20px',
                fontSize: '15px',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
            }}>
                需要整理的标签数量: <strong>{selectedBookmarkCount}</strong>
            </div>
            <br/>

            <Tooltip placement="bottom" title="整理后的书签会放在其他收藏夹中哦!" color={'#2db7f5'}>
                <Button
                    type="primary"
                    icon={<PoweroffOutlined/>}
                    loading={buttMes === 1} // 当 buttMes 为 1 时显示加载状态
                    onClick={() => labelOrganization(1, selectFolders)}
                    style={{
                        marginTop: '20px',
                        width: '100%',
                        backgroundColor: '#1890ff',
                        borderColor: '#1890ff',
                        height: '40px',
                        fontSize: '15px',
                        fontWeight: 'bold'
                    }}
                >
                    {getButtonText()}
                </Button>
            </Tooltip>


            <div style={{
                position: 'absolute', // 将图标的容器设置为绝对定位
                right: '20px', // 根据需要调整右边距
                bottom: '20px', // 根据需要调整底边距
            }}>
                <GithubOutlined
                    style={{fontSize: '35px', cursor: 'pointer'}}
                    onClick={handleIconClick}
                />
            </div>

            <div style={{marginTop: '20px', fontSize: 13}}>
                <span>
                    Ps：插件调用OpenAI gpt-3.5，如整理失败，可重新尝试整理。暂只支持指定收藏夹整理，
                    项目已开源，欢迎各位大佬指点！
                </span>
            </div>
        </div>

    );
};

export default Popup;
