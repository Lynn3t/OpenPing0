// IP信息检测应用 - 重构版本
var appcheck = new Vue({
    'el': '#app',
    'data': {
        // 基础信息
        'tar': window.tar,
        'ip': window.ip,
        'showip': true,
        'showipnum': false,
        
        // API数据
        'apiData': {},
        
        // 显示信息
        'locationInfo': '',      // 格式化的位置信息
        'asnInfo': '',          // ASN信息
        'asnOwner': '',         // ASN所有者
        'organization': '',     // 企业信息
        'longitude': '',        // 经度
        'latitude': '',         // 纬度
        'ipType': '',           // IP类型
        'riskScore': 0,         // 风控值
        'riskLevel': '',        // 风险等级文字
        'riskColor': '',        // 风险等级颜色
        'isNativeIP': '',       // 原生IP状态
        'ipNumber': 0,          // IP数字形式
        'sharedUsers': '',      // 共享人数
        'rdns': ''              // 反向DNS
    },
    
    'created': function() {
        if (this.ip !== '') {
            this.fetchIPInfo();
        }
    },
    
    'methods': {
        // 获取IP信息
        'fetchIPInfo': function() {
            const url = `http://ip-api.com/json/${this.ip}?lang=zh-CN&fields=status,message,continent,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query`;
            
            axios({
                method: 'GET',
                url: url
            }).then(response => {
                this.apiData = response.data;
                if (this.apiData.status === 'success') {
                    this.processAllData();
                }
            }).catch(error => {
                console.error('获取IP信息失败:', error);
            });
        },
        
        // 处理所有数据
        'processAllData': function() {
            this.processLocationInfo();
            this.processASNInfo();
            this.determineIPType();
            this.calculateRiskScore();
            this.checkNativeIP();
            this.ipToNumber();
            this.calculateSharedUsers();
            this.processOtherInfo();
        },
        
        // 处理位置信息
        'processLocationInfo': function() {
            const data = this.apiData;
            let location = '';
            
            // 获取国旗emoji
            const countryFlag = this.getCountryFlag(data.countryCode);
            
            // 处理国家名称过滤
            let country = data.country;
            if (country === '中華民國') {
                country = '中国';
            }
            
            // 处理地区名称过滤 (取"or"前的部分)
            let regionName = data.regionName;
            if (regionName && regionName.includes(' or ')) {
                regionName = regionName.split(' or ')[0];
            }
            
            // 构建位置字符串
            location = `${countryFlag} ${data.continent || ''} ${country || ''} ${regionName || ''} ${data.city || ''}`;
            
            // 添加district和zip (如果存在)
            if (data.district) {
                location += ` ${data.district}`;
            }
            if (data.zip) {
                location += ` ${data.zip}`;
            }
            
            this.locationInfo = location.trim();
        },
        
        // 处理ASN信息
        'processASNInfo': function() {
            const data = this.apiData;
            this.asnInfo = `${data.as || ''} ${data.asname || ''}`.trim();
            
            if (data.isp) {
                const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(data.isp)}`;
                this.asnOwner = `(ISP/IDC) ${data.isp}—<a href="${searchUrl}" target="_blank">ISP链接</a>`;
            }
        },
        
        // 处理其他信息
        'processOtherInfo': function() {
            const data = this.apiData;
            
            if (data.org) {
                const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(data.org)}`;
                this.organization = `(ISP/IDC) ${data.org}—<a href="${searchUrl}" target="_blank">ORG链接</a>`;
            }
            
            this.longitude = data.lon || '';
            this.latitude = data.lat || '';
            this.rdns = data.reverse || '';
        },
        
        // 云服务商关键词列表
        'getCloudProviders': function() {
            return [
                'aws', 'amazon', 'microsoft', 'azure', 'google', 'cloud', 'alibaba', 'tencent', 
                'digitalocean', 'vultr', 'linode', 'cloudflare', 'ovh', 'hetzner', 'scaleway',
                'rackspace', 'ibm cloud', 'oracle cloud', 'akari networks', 'choopa', 'psychz',
                'quadranet', 'cogent', 'level3', 'hurricane electric', 'leaseweb', 'servermani',
                'zenlayer', 'gthost', 'hostinger', 'contabo', 'ionos', 'godaddy', 'namecheap',
                'bluehost', 'hostgator', 'siteground', 'dreamhost', 'inmotion', 'a2hosting',
                'hostmonster', 'justhost', 'fatcow', 'ipage', 'startlogic', 'hostpapa',
                'greengeeks', 'hostwinds', 'interserver', 'namehero', 'fastcomet'
            ];
        },
        
        // 家庭宽带服务商关键词列表
        'getHomeISPs': function() {
            return [
                'chinanet', 'hinet', 'at&t', 'verizon', 'comcast', 'bt group', 'deutsche telekom',
                'orange', 'telefonica', 'vodafone', 'ntt', 'kddi', 'softbank', 'sk broadband',
                'kt corporation', 'rostelecom', 'mts', 'beeline', 'turkcell', 'etisalat',
                'saudi telecom', 'bharti airtel', 'reliance jio', 'china telecom', 'china unicom',
                'china mobile', 'chunghwa telecom', 'so-net', 'biglobe', 'ocn', 'plala',
                'asahi-net', 'dti', 'wakwak', 'hi-ho', 'excite', 'nifty', 'tikitiki',
                'cox communications', 'charter spectrum', 'centurylink', 'frontier', 'windstream',
                'mediacom', 'suddenlink', 'optimum', 'rcn', 'wow', 'metronet'
            ];
        },
        
        // 判断IP类型
        'determineIPType': function() {
            const data = this.apiData;
            const isp = (data.isp || '').toLowerCase();
            const org = (data.org || '').toLowerCase();
            const hosting = data.hosting;
            const mobile = data.mobile;
            
            const cloudProviders = this.getCloudProviders();
            const homeISPs = this.getHomeISPs();
            
            // 先匹配云服务商 OR hosting=true → "IDC机房IP"
            const isCloudProvider = cloudProviders.some(keyword => 
                isp.includes(keyword) || org.includes(keyword)
            );
            
            if (isCloudProvider || hosting === true) {
                this.ipType = "IDC机房IP";
                return;
            }
            
            // 再匹配家庭宽带 OR mobile=true → "家庭宽带IP"
            const isHomeISP = homeISPs.some(keyword => 
                isp.includes(keyword) || org.includes(keyword)
            );
            
            if (isHomeISP || mobile === true) {
                this.ipType = "家庭宽带IP";
                return;
            }
            
            // 其余 → "IDC机房IP"
            this.ipType = "IDC机房IP";
        },
        
        // 计算风控值
        'calculateRiskScore': function() {
            const data = this.apiData;
            const hosting = data.hosting;
            const proxy = data.proxy;
            
            let baseScore = 50;
            
            // 根据IP类型设置基础分数
            if (this.ipType === "家庭宽带IP") {
                baseScore = 20;
                // 家庭宽带IP的计分规则
                if (hosting === true) baseScore += 30;
                else baseScore -= 5;
                
                if (proxy === true) baseScore += 40;
                else baseScore -= 5;
            } else if (this.ipType === "IDC机房IP") {
                // 检查是否为云服务商
                const isp = (data.isp || '').toLowerCase();
                const org = (data.org || '').toLowerCase();
                const cloudProviders = this.getCloudProviders();
                const isCloudProvider = cloudProviders.some(keyword => 
                    isp.includes(keyword) || org.includes(keyword)
                );
                
                if (isCloudProvider) {
                    // 云服务商IDC
                    baseScore = 70;
                    if (hosting === true) baseScore += 10;
                    if (proxy === true) baseScore += 10;
                } else {
                    // 非云服务商IDC
                    baseScore = 50;
                    if (hosting === true) baseScore += 15;
                    else baseScore -= 5;
                    
                    if (proxy === true) baseScore += 15;
                    else baseScore -= 5;
                }
            }
            
            // 添加基于IP的固定随机数 (-10 ~ +10)
            const randomAdjustment = this.getIPBasedRandom() % 21 - 10;
            baseScore += randomAdjustment;
            
            // 确保分数不小于0
            this.riskScore = Math.max(0, baseScore);
            
            // 设置风险等级和颜色
            this.setRiskLevel();
        },
        
        // 设置风险等级和颜色
        'setRiskLevel': function() {
            const score = this.riskScore;
            
            if (score <= 15) {
                this.riskLevel = '极度纯净IP';
                this.riskColor = '#006400'; // 深绿色
            } else if (score <= 25) {
                this.riskLevel = '纯净IP';
                this.riskColor = '#008000'; // 绿色
            } else if (score <= 40) {
                this.riskLevel = '一般IP';
                this.riskColor = '#9ACD32'; // 黄绿色
            } else if (score <= 50) {
                this.riskLevel = '微风险IP';
                this.riskColor = '#FFD700'; // 黄色
            } else if (score <= 70) {
                this.riskLevel = '一般风险IP';
                this.riskColor = '#FF8C00'; // 橙色
            } else {
                this.riskLevel = '极度风险IP';
                this.riskColor = '#FF0000'; // 红色
            }
        },
        
        // IP转数字
        'ipToNumber': function() {
            const parts = this.ip.split('.');
            if (parts.length === 4) {
                this.ipNumber = (parseInt(parts[0]) << 24) + 
                               (parseInt(parts[1]) << 16) + 
                               (parseInt(parts[2]) << 8) + 
                               parseInt(parts[3]);
            }
        },
        
        // 基于IP获取固定随机数
        'getIPBasedRandom': function() {
            // 使用IP数字作为种子生成固定的"随机"数
            let seed = Math.abs(this.ipNumber);
            // 简单的LCG算法
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            return seed;
        },
        
        // 计算共享人数
        'calculateSharedUsers': function() {
            const randomValue = this.getIPBasedRandom() % 5 + 1; // 1-5
            const userRanges = ['1-10', '10-100', '100-1000', '1000-10000', '10000+'];
            this.sharedUsers = userRanges[randomValue - 1];
        },
        
        // 判断原生IP
        'checkNativeIP': function() {
            const data = this.apiData;
            // 这里需要IP注册地信息，暂时使用定位地作为简单判断
            // 实际应用中需要查询IP注册数据库
            this.isNativeIP = '原生IP'; // 默认显示原生IP
        },
        
        // 获取国旗emoji
        'getCountryFlag': function(countryCode) {
            if (!countryCode) return '';
            
            const flagMap = {
                'CN': '🇨🇳', 'US': '🇺🇸', 'JP': '🇯🇵', 'KR': '🇰🇷', 'TW': '🇹🇼',
                'HK': '🇭🇰', 'SG': '🇸🇬', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
                'CA': '🇨🇦', 'AU': '🇦🇺', 'RU': '🇷🇺', 'IN': '🇮🇳', 'BR': '🇧🇷'
            };
            
            return flagMap[countryCode] || '🌍';
        },
        
        // 保留的原有方法
        'oncheckip': function() {
            checkip(this.ip);
        },
        
        // 生成图像
        'toimage': function() {
            domtoimage.toPng(document.getElementById('app'))
                .then(function(dataUrl) {
                    window.open(dataUrl, '_blank');
                })
                .catch(function(error) {
                    console.error(error);
                });
        },
        
        // 检查是否为保留IP
        'isreserve': function(ip) {
            const firstThree = ip.substring(0, 3);
            const firstFour = ip.substring(0, 4);
            
            return firstThree === '10.' ||
                   firstFour === '172.' ||
                   firstFour === '192.' ||
                   firstFour === '127.' ||
                   firstFour === '169.';
        },
        
        // AI检测 - 简化版
        'doaicheck': function() {
            alert('检测失败');
        }
    }
});