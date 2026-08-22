/**
 * Harbor連携版 Googleドライブ権限自動反映スクリプト
 * ---------------------------------------------------
 * 「あるべき権限一覧」をCREW Harborのスプレッドシート(団体所属・人・クラウド)から作り、
 * 現状のGoogleドライブの権限と突き合わせて、差分だけを反映する仕組みです。
 *
 * このスクリプトは、新しく空のGoogleスプレッドシートを1つ用意して、
 * そこに貼り付けて使うことを想定しています。作業用のシート(アクセス権一覧・
 * アクセス状況・権限変更・ログ)は、初めて各機能を実行したときに自動で作られるので、
 * 事前にシートを手作業で用意する必要はありません。
 *
 * ▼ 導入手順は、このファイルの一番下のコメントに書いてあります。
 */

// ==== 設定 ここを確認してください ====================================

// CREW Harborが使っているスプレッドシートのID
// (harbor.isct-crew.jp のデータが入っているシートです。
//  スプレッドシートのURLの https://docs.google.com/spreadsheets/d/【ここ】/edit の部分)
const HARBOR_SHEET_ID = '1FRTTVPOlFPHmqmH_g2tePfpXPvxJ0fNLM99nLVHLmgM';

// 毎晩自動反映を実行する時刻(24時制、0〜23)
const NIGHTLY_SYNC_HOUR = 3;

// ==== ここまで設定 ====================================================


/**
 * スプレッドシートを開いたときに実行される関数。
 * メニューバーにカスタムメニューを追加します。
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Harbor連携 管理メニュー')
    .addItem('① アクセス権一覧 更新(Harborから取得)', 'createIdealAccessListFromHarbor')
    .addItem('② アクセス状況 更新', 'getCurrentAccessStatus')
    .addSeparator()
    .addItem('③ 権限変更リスト作成', 'generatePermissionChangeList')
    .addItem('④ 権限変更リストを反映', 'executePermissionChanges')
    .addSeparator()
    .addItem('①〜④ まとめて今すぐ実行', 'runFullSyncManually')
    .addSeparator()
    .addItem('毎晩自動実行を有効にする', 'installNightlyTrigger')
    .addItem('毎晩自動実行を停止する', 'removeNightlyTrigger')
    .addToUi();
}

/**
 * 指定した名前のシートがまだ無ければ、見出し付きで新しく作る。
 * 既にある場合はそのまま返す(中身は消さない)。
 */
function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// ===========================================================================
// ① Harborの団体所属・クラウドシートから「あるべき権限一覧」を作る
// ===========================================================================

/**
 * Harborのスプレッドシートから、団体所属(誰がどのロールを持っているか)と
 * 人(氏名)を読み取り、団体IDごとの「メンバー一覧(氏名・メール・ロール)」を作る。
 */
function getHarborRoster_() {
  const harborSs = SpreadsheetApp.openById(HARBOR_SHEET_ID);
  const peopleSheet = harborSs.getSheetByName('人');
  const affSheet = harborSs.getSheetByName('団体所属');

  const nameByEmail = new Map();
  const peopleLastRow = peopleSheet.getLastRow();
  if (peopleLastRow > 1) {
    const peopleData = peopleSheet.getRange(2, 1, peopleLastRow - 1, 2).getValues();
    peopleData.forEach(row => {
      const email = (row[0] || '').toString().trim().toLowerCase();
      const name = row[1] || '';
      if (email) nameByEmail.set(email, name);
    });
  }

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const rosterByGroup = new Map(); // groupId -> [{email, name, roles: [...]}]

  const affLastRow = affSheet.getLastRow();
  if (affLastRow > 1) {
    const affData = affSheet.getRange(2, 1, affLastRow - 1, 5).getValues();
    affData.forEach(row => {
      const email = (row[0] || '').toString().trim().toLowerCase();
      const groupId = row[1] || '';
      const rolesStr = row[3] || '';
      const expiresAt = row[4] || '';
      if (!email || !groupId) return;
      if (expiresAt && expiresAt < today) return; // 期限切れの所属は除外

      const roles = rolesStr.toString().split(',').map(r => r.trim()).filter(Boolean);
      if (!rosterByGroup.has(groupId)) rosterByGroup.set(groupId, []);
      rosterByGroup.get(groupId).push({
        email: email,
        name: nameByEmail.get(email) || email,
        roles: roles,
      });
    });
  }

  return rosterByGroup;
}

/**
 * HarborのクラウドシートからフォルダーIDを抽出しつつ、
 * 「団体ID・フォルダー名・フォルダーID・対象ロール(空なら全員)・権限」のルール一覧を作る。
 */
function getHarborCloudRules_() {
  const harborSs = SpreadsheetApp.openById(HARBOR_SHEET_ID);
  const groupSheet = harborSs.getSheetByName('団体');
  const cloudSheet = harborSs.getSheetByName('クラウド');

  const groupNameById = new Map();
  const groupLastRow = groupSheet.getLastRow();
  if (groupLastRow > 1) {
    const groupData = groupSheet.getRange(2, 1, groupLastRow - 1, 2).getValues();
    groupData.forEach(row => {
      if (row[0]) groupNameById.set(row[0], row[1] || row[0]);
    });
  }

  const rules = [];
  const cloudLastRow = cloudSheet.getLastRow();
  if (cloudLastRow > 1) {
    const cloudData = cloudSheet.getRange(2, 1, cloudLastRow - 1, 5).getValues();
    cloudData.forEach(row => {
      const groupId = row[0];
      const label = row[1] || '';
      const url = row[2] || '';
      const rolesStr = row[3] || '';
      const permission = row[4] === 'writer' ? 'writer' : 'reader';
      if (!groupId || !url) return;

      const folderId = extractFolderId_(url);
      if (!folderId) {
        console.warn(`フォルダーIDを取り出せませんでした(団体:${groupId} / ${label} / ${url})。スキップします。`);
        return;
      }

      const roles = rolesStr.toString().split(',').map(r => r.trim()).filter(Boolean);
      const groupName = groupNameById.get(groupId) || groupId;

      rules.push({
        groupId: groupId,
        folderName: `${groupName} / ${label}`,
        folderId: folderId,
        roles: roles, // 空配列 = 団体の全員
        permission: permission,
      });
    });
  }

  return rules;
}

/**
 * GoogleドライブのフォルダーURLからフォルダーIDを取り出す。
 * 対応できない形式の場合は null を返す。
 */
function extractFolderId_(url) {
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];

  return null;
}

/**
 * ① 「あるべき権限一覧」をHarborのデータから作り、アクセス権一覧シートに書き込む。
 */
function createIdealAccessListFromHarbor() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const outputSheet = ensureSheet_(ss, 'アクセス権一覧', ['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '付与理由']);

  const rosterByGroup = getHarborRoster_();
  const rules = getHarborCloudRules_();

  const outputRows = [];
  const processedSet = new Set();

  rules.forEach(rule => {
    const members = rosterByGroup.get(rule.groupId) || [];

    // roles が空 = 団体の全員が対象。指定があれば、そのロールを持つ人だけが対象。
    const targetMembers = rule.roles.length === 0
      ? members
      : members.filter(m => m.roles.some(r => rule.roles.includes(r)));

    const grantedReason = rule.roles.length === 0 ? '団体全員' : rule.roles.join('・');

    targetMembers.forEach(m => {
      const uniqueKey = m.email + '_' + rule.folderId;
      if (processedSet.has(uniqueKey)) return;
      outputRows.push([m.name, m.email, rule.folderName, rule.folderId, rule.permission, grantedReason]);
      processedSet.add(uniqueKey);
    });
  });

  outputSheet.clearContents();
  outputSheet.getRange(1, 1, 1, 6).setValues([['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '付与理由']]);
  if (outputRows.length > 0) {
    outputSheet.getRange(2, 1, outputRows.length, 6).setValues(outputRows);
  }

  console.log(`${outputRows.length} 件のリストを作成しました。`);
  if (!isAutoChainRunning_()) {
    Browser.msgBox('アクセス権限一覧の更新が完了しました。');
  }
}

// ===========================================================================
// ② 現状のアクセス状況を取得する(元のスクリプトとほぼ同じ。読み込み元だけ変更)
// ===========================================================================

function getCurrentAccessStatus() {
  deleteTriggers_('getCurrentAccessStatus');

  const START_TIME = new Date().getTime();
  const TIME_LIMIT = 5 * 60 * 1000; // 5分

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const outputSheet = ensureSheet_(ss, 'アクセス状況', ['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '区分']);
  const props = PropertiesService.getScriptProperties();

  // 名簿辞書作成(Harborの人シートから)
  const harborSs = SpreadsheetApp.openById(HARBOR_SHEET_ID);
  const peopleSheet = harborSs.getSheetByName('人');
  const nameMap = new Map();
  const peopleLastRow = peopleSheet.getLastRow();
  if (peopleLastRow > 1) {
    const peopleData = peopleSheet.getRange(2, 1, peopleLastRow - 1, 2).getValues();
    peopleData.forEach(row => {
      const email = (row[0] || '').toString().trim().toLowerCase();
      if (email) nameMap.set(email, row[1] || '');
    });
  }

  // チェック対象のフォルダー一覧は、Harborのクラウドシートのルールから作る
  const rules = getHarborCloudRules_();
  const folderList = [];
  const seenFolderIds = new Set();
  rules.forEach(rule => {
    if (seenFolderIds.has(rule.folderId)) return;
    seenFolderIds.add(rule.folderId);
    folderList.push({ folderName: rule.folderName, folderId: rule.folderId });
  });

  let startRowIndex = parseInt(props.getProperty('CURRENT_ACCESS_STATUS_INDEX') || '0');

  if (startRowIndex === 0) {
    outputSheet.clearContents();
    outputSheet.getRange(1, 1, 1, 6).setValues([['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '区分']]);
    console.log('処理を開始します...');
  } else {
    console.log(`${startRowIndex} 件目から処理を再開します...`);
  }

  const outputRows = [];

  for (let i = startRowIndex; i < folderList.length; i++) {
    if (new Date().getTime() - START_TIME > TIME_LIMIT) {
      props.setProperty('CURRENT_ACCESS_STATUS_INDEX', i.toString());
      if (outputRows.length > 0) outputSheet.getRange(outputSheet.getLastRow() + 1, 1, outputRows.length, 6).setValues(outputRows);

      ScriptApp.newTrigger('getCurrentAccessStatus').timeBased().after(1 * 60 * 1000).create();
      console.log('時間制限中断。続きは1分後。');
      return;
    }

    const { folderName, folderId } = folderList[i];

    try {
      const folder = DriveApp.getFolderById(folderId);
      const access = folder.getSharingAccess();
      const permission = folder.getSharingPermission();

      if (access === DriveApp.Access.ANYONE_WITH_LINK || access === DriveApp.Access.ANYONE) {
        const roleCode = (permission === DriveApp.Permission.EDIT) ? 'writer' : 'reader';
        const roleName = (permission === DriveApp.Permission.EDIT) ? '編集者' : '閲覧者';
        outputRows.push([`リンクを知っている全員(${roleName})`, '', folderName, folderId, roleCode, '現状設定']);
      }

      const checkUser = (user, role) => {
        const rawEmail = user.getEmail();
        const emailKey = rawEmail.toLowerCase();
        let displayName = nameMap.has(emailKey) ? nameMap.get(emailKey) : user.getName();
        if (!displayName) displayName = rawEmail.split('@')[0];
        outputRows.push([displayName, rawEmail, folderName, folderId, role, '現状設定']);
      };

      folder.getEditors().forEach(u => checkUser(u, 'writer'));
      folder.getViewers().forEach(u => checkUser(u, 'reader'));

    } catch (e) {
      outputRows.push(['取得エラー', '', folderName, folderId, 'error', e.message]);
    }
  }

  if (outputRows.length > 0) outputSheet.getRange(outputSheet.getLastRow() + 1, 1, outputRows.length, 6).setValues(outputRows);
  props.deleteProperty('CURRENT_ACCESS_STATUS_INDEX');
  deleteTriggers_('getCurrentAccessStatus');

  console.log('完了しました。');
  if (isAutoChainRunning_()) {
    // 自動実行中は、続けて③④まで一気に進める
    generatePermissionChangeList();
    executePermissionChanges();
  } else {
    Browser.msgBox('現状確認が完了しました。');
  }
}

// ===========================================================================
// ③ 差分抽出(元のスクリプトと同じ)
// ===========================================================================

function generatePermissionChangeList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const idealSheet = ensureSheet_(ss, 'アクセス権一覧', ['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '付与理由']);
  const actualSheet = ensureSheet_(ss, 'アクセス状況', ['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '区分']);
  const changeSheet = ensureSheet_(ss, '権限変更', ['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '操作内容']);

  const harborSs = SpreadsheetApp.openById(HARBOR_SHEET_ID);
  const peopleSheet = harborSs.getSheetByName('人');
  const nameMap = new Map();
  const peopleLastRow = peopleSheet.getLastRow();
  if (peopleLastRow > 1) {
    const peopleData = peopleSheet.getRange(2, 1, peopleLastRow - 1, 2).getValues();
    peopleData.forEach(row => {
      const email = (row[0] || '').toString().trim().toLowerCase();
      if (email) nameMap.set(email, row[1] || '');
    });
  }

  const idealData = idealSheet.getLastRow() > 1 ? idealSheet.getRange(2, 1, idealSheet.getLastRow() - 1, 5).getValues() : [];
  const actualData = actualSheet.getLastRow() > 1 ? actualSheet.getRange(2, 1, actualSheet.getLastRow() - 1, 5).getValues() : [];

  const idealMap = new Map();
  const actualMap = new Map();

  idealData.forEach(row => {
    const key = (row[1] === '') ? `LINK_${row[3]}` : `${row[1].toString().toLowerCase()}_${row[3]}`;
    idealMap.set(key, { name: row[0], email: row[1], folderName: row[2], folderId: row[3], role: row[4] });
  });

  actualData.forEach(row => {
    const key = (row[1] === '') ? `LINK_${row[3]}` : `${row[1].toString().toLowerCase()}_${row[3]}`;
    actualMap.set(key, { name: row[0], email: row[1], folderName: row[2], folderId: row[3], role: row[4] });
  });

  const outputRows = [];

  idealMap.forEach((idealVal, key) => {
    const actualVal = actualMap.get(key);
    if (!actualVal) {
      outputRows.push([idealVal.name, idealVal.email, idealVal.folderName, idealVal.folderId, idealVal.role, '追加']);
    } else if (actualVal.role !== idealVal.role) {
      outputRows.push([idealVal.name, idealVal.email, idealVal.folderName, idealVal.folderId, idealVal.role, '変更']);
    }
  });

  actualMap.forEach((actualVal, key) => {
    if (!idealMap.has(key)) {
      // 個人のreader(閲覧者)は、親フォルダーからの継承である可能性が高いので無視する
      if (actualVal.role === 'reader' && actualVal.email !== '') {
        return;
      }

      let displayName = actualVal.name;
      const email = actualVal.email;
      if (email) {
        const emailKey = email.toString().toLowerCase();
        if (nameMap.has(emailKey)) displayName = nameMap.get(emailKey);
      }
      outputRows.push([displayName, email, actualVal.folderName, actualVal.folderId, actualVal.role, '削除']);
    }
  });

  changeSheet.clearContents();
  changeSheet.getRange(1, 1, 1, 6).setValues([['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '操作内容']]);
  changeSheet.getRange(1, 7).setValue('ステータス');

  if (outputRows.length > 0) {
    changeSheet.getRange(2, 1, outputRows.length, 6).setValues(outputRows);
    console.log(`${outputRows.length} 件の変更操作をリストアップしました。`);
  } else {
    console.log('変更なし');
  }

  if (!isAutoChainRunning_()) {
    Browser.msgBox('権限変更リストの作成が完了しました。');
  }
}

// ===========================================================================
// ④ 権限変更を適用する(元のスクリプトとほぼ同じ。Browser.msgBoxを外しただけ)
// ===========================================================================

function executePermissionChanges() {
  deleteTriggers_('executePermissionChanges');

  const START_TIME = new Date().getTime();
  const TIME_LIMIT = 5 * 60 * 1000; // 5分

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const changeSheet = ensureSheet_(ss, '権限変更', ['氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '権限', '操作内容']);
  const logSheet = ensureSheet_(ss, 'ログ', ['日時', '氏名', 'GoogleID', 'フォルダー名', 'フォルダーID', '結果']);

  const lastRow = changeSheet.getLastRow();
  if (lastRow < 2) return;

  if (changeSheet.getRange(1, 7).getValue() !== 'ステータス') changeSheet.getRange(1, 7).setValue('ステータス');
  const dataRange = changeSheet.getRange(2, 1, lastRow - 1, 7);
  const data = dataRange.getValues();
  const logs = [];

  console.log('変更処理開始...');

  for (let i = 0; i < data.length; i++) {
    if (new Date().getTime() - START_TIME > TIME_LIMIT) {
      if (logSheet && logs.length > 0) logSheet.getRange(logSheet.getLastRow() + 1, 1, logs.length, 6).setValues(logs);

      ScriptApp.newTrigger('executePermissionChanges').timeBased().after(1 * 60 * 1000).create();
      console.log('時間制限中断。続きは1分後。');
      return;
    }

    const row = data[i];
    const status = row[6];
    if (status === '完了' || status === 'ID不正') continue;

    const name = row[0];
    const email = row[1];
    const folderName = row[2];
    const folderId = row[3];
    const role = row[4];
    const action = row[5];

    if (!folderId) continue;

    try {
      const folder = DriveApp.getFolderById(folderId);
      let resultMsg = '';

      if (action === '削除') {
        if (email === '') {
          folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
          resultMsg = 'リンク共有解除';
        } else {
          try {
            folder.removeEditor(email);
            folder.removeViewer(email);
            resultMsg = `権限削除: ${email}`;
          } catch (e) { resultMsg = `削除スキップ: ${email}`; }
        }
      } else if (action === '追加' || action === '変更') {
        if (email === '') {
          const accessType = DriveApp.Access.ANYONE_WITH_LINK;
          const permissionType = (role === 'writer') ? DriveApp.Permission.EDIT : DriveApp.Permission.VIEW;
          folder.setSharing(accessType, permissionType);
          resultMsg = `リンク共有設定: ${role}`;
        } else {
          const resource = { role: role, type: 'user', value: email };
          Drive.Permissions.insert(resource, folderId, { sendNotificationEmails: false, supportsAllDrives: true });
          resultMsg = `権限${action}: ${email} (${role})`;
        }
      }

      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
      logs.push([timestamp, name, email, folderName, folderId, resultMsg]);
      changeSheet.getRange(i + 2, 7).setValue('完了');

    } catch (e) {
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
      let statusText = 'エラー';
      let errorDetail = `エラー: ${e.message}`;

      const msg = e.message.toLowerCase();
      if (msg.includes('invalid email') || msg.includes('user not found') || msg.includes('does not exist')) {
        statusText = 'ID不正';
        errorDetail = `IDが存在しません: ${email}`;
      }

      logs.push([timestamp, name, email, folderName, folderId, errorDetail]);
      changeSheet.getRange(i + 2, 7).setValue(statusText);
    }
  }

  if (logSheet && logs.length > 0) logSheet.getRange(logSheet.getLastRow() + 1, 1, logs.length, 6).setValues(logs);
  deleteTriggers_('executePermissionChanges');
  console.log('完了しました。');
  if (!isAutoChainRunning_()) {
    Browser.msgBox('処理が完了しました。');
  }
  clearAutoChainFlag_();
}

// ===========================================================================
// まとめて実行・自動実行の仕組み
// ===========================================================================

/**
 * メニューの「①〜④ まとめて今すぐ実行」から呼ばれる。
 */
function runFullSyncManually() {
  setAutoChainFlag_();
  createIdealAccessListFromHarbor();
  getCurrentAccessStatus();
  // ここから先(③④、場合によっては②の続き)は、各関数の中で自動的に連鎖する。
  // すべて完了すると自動でログに記録される(処理が長引く場合、この関数自体は
  // 先に終了するが、続きはトリガーで自動的に進む)。
}

/**
 * 毎晩の自動実行トリガーから呼ばれる関数。
 */
function nightlySync() {
  runFullSyncManually();
}

/**
 * 「毎晩自動実行を有効にする」メニューから呼ぶ。1回実行すればOK。
 */
function installNightlyTrigger() {
  removeNightlyTrigger();
  ScriptApp.newTrigger('nightlySync')
    .timeBased()
    .everyDays(1)
    .atHour(NIGHTLY_SYNC_HOUR)
    .create();
  Browser.msgBox(`毎晩${NIGHTLY_SYNC_HOUR}時ごろに自動反映するよう設定しました。`);
}

/**
 * 「毎晩自動実行を停止する」メニューから呼ぶ。
 */
function removeNightlyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'nightlySync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function setAutoChainFlag_() {
  PropertiesService.getScriptProperties().setProperty('AUTO_CHAIN', '1');
}

function clearAutoChainFlag_() {
  PropertiesService.getScriptProperties().deleteProperty('AUTO_CHAIN');
}

function isAutoChainRunning_() {
  return PropertiesService.getScriptProperties().getProperty('AUTO_CHAIN') === '1';
}

/**
 * トリガー削除用ヘルパー関数(強化版)
 */
function deleteTriggers_(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  const allTriggers = ScriptApp.getProjectTriggers();
  if (allTriggers.length > 15) {
    console.warn('トリガー過多のため緊急削除を実行します');
    allTriggers.forEach(trigger => {
      const handler = trigger.getHandlerFunction();
      if (handler !== functionName && handler !== 'nightlySync') {
        try { ScriptApp.deleteTrigger(trigger); } catch (e) { }
      }
    });
  }
}

/**
 * ▼ 導入手順 ▼
 *
 * 1. sheets.google.com で、新しい空のスプレッドシートを1つ作る
 *    (名前は何でもよいが、例:「CREW Harbor 権限管理」)
 * 2. そのスプレッドシートの、拡張機能 → Apps Script を開く
 * 3. 最初から入っている空のコード(function myFunction() {} など)を全部消して、
 *    このファイルの内容をすべて貼り付ける
 * 4. 画面左側の「サービス」の横の + ボタンから「Drive API」を検索して追加する
 *    (「Drive」ではなく「Drive API」という詳細サービスの方です)
 * 5. スプレッドシートのタブを開き直す(再読み込みする)。
 *    メニューバーに「Harbor連携 管理メニュー」が出てくることを確認する
 * 6. まず「① アクセス権一覧 更新(Harborから取得)」を1回実行してみる
 *    → 初回はGoogleアカウントへのアクセス許可を求められるので、許可する
 *      (「このアプリは Google で確認されていません」と出た場合は、
 *      詳細を開いて「(安全ではないページ)に移動」を選べば進めます。
 *      自分で作ったスクリプトなので問題ありません)
 *    → 「アクセス権一覧」というシートが自動で作られ、Harborの団体所属・
 *      クラウドシートの内容から作られた一覧が入れば成功
 * 7. 続けて「①〜④ まとめて今すぐ実行」を1回実行し、「権限変更」「ログ」シートが
 *    自動で作られ、意図した内容が反映されるか確認する
 * 8. 問題なければ「毎晩自動実行を有効にする」を1回実行する
 *    (これで、Harbor側でロールやDriveリンクを変更するたびに、
 *    毎晩自動でDriveの共有設定に反映されるようになります)
 *
 * ※ 作業用のシート(アクセス権一覧・アクセス状況・権限変更・ログ)は、
 *   それぞれ初めて実行したときに自動で作られます。事前に手作業で
 *   シートを用意する必要はありません。
 * ※ 「クラウド」シートに登録するURLは、必ずGoogleドライブの「フォルダー」の
 *   URLにしてください(ファイル単体のURLは対応していません)。
 * ※ 反映結果は「ログ」シートに毎回記録されるので、翌朝に確認できます。
 */
